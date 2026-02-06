import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// =============================================================================
// ATTORNEY QUERIES
// =============================================================================

export const getAll = query({
  args: {
    status: v.optional(v.string()),
    tier: v.optional(v.string()),
    caseType: v.optional(v.string()),
    county: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("attorneys").order("desc");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    if (args.tier) {
      query = query.withIndex("by_tier", (q) => q.eq("subscriptionTier", args.tier));
    }

    const attorneys = await query.take(args.limit || 100);

    // Enrich with user info, specializations, and counties
    const enriched = await Promise.all(
      attorneys.map(async (attorney) => {
        const user = await ctx.db.get(attorney.userId);
        const specializations = await ctx.db
          .query("attorneySpecializations")
          .withIndex("by_attorney", (q) => q.eq("attorneyId", attorney._id))
          .collect();
        const counties = await ctx.db
          .query("attorneyCounties")
          .withIndex("by_attorney", (q) => q.eq("attorneyId", attorney._id))
          .collect();

        return {
          ...attorney,
          user: user ? {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
          specializations: specializations.map(s => ({
            caseType: s.caseType,
            isPrimary: s.isPrimary,
            yearsExperience: s.yearsExperience,
          })),
          counties: counties.map(c => ({
            county: c.county,
            state: c.state,
            priority: c.priority,
            isPrimaryOffice: c.isPrimaryOffice,
          })),
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("attorneys") },
  handler: async (ctx, args) => {
    const attorney = await ctx.db.get(args.id);
    if (!attorney) return null;

    const user = await ctx.db.get(attorney.userId);
    const specializations = await ctx.db
      .query("attorneySpecializations")
      .withIndex("by_attorney", (q) => q.eq("attorneyId", args.id))
      .collect();
    const counties = await ctx.db
      .query("attorneyCounties")
      .withIndex("by_attorney", (q) => q.eq("attorneyId", args.id))
      .collect();

    // Get recent transfers for stats
    const transfers = await ctx.db
      .query("caseTransfers")
      .withIndex("by_attorney", (q) => q.eq("attorneyId", args.id))
      .order("desc")
      .take(100);

    const totalReceived = transfers.length;
    const accepted = transfers.filter(t => t.status === "accepted").length;
    const declined = transfers.filter(t => t.status === "declined").length;
    const expired = transfers.filter(t => t.status === "expired").length;

    return {
      ...attorney,
      user: user ? {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      } : null,
      specializations,
      counties,
      stats: {
        totalReceived,
        accepted,
        declined,
        expired,
        acceptanceRate: totalReceived > 0 ? (accepted / totalReceived * 100).toFixed(1) : "0",
      },
    };
  },
});

export const getBySpecializationAndLocation = query({
  args: {
    caseType: v.string(),
    county: v.string(),
    state: v.union(v.literal("NY"), v.literal("NJ")),
  },
  handler: async (ctx, args) => {
    // Find specializations for this case type
    const specializations = await ctx.db
      .query("attorneySpecializations")
      .withIndex("by_case_type", (q) => q.eq("caseType", args.caseType))
      .collect();

    // Filter by active attorneys who serve the location
    const results = [];
    for (const spec of specializations) {
      const attorney = await ctx.db.get(spec.attorneyId);
      if (!attorney || attorney.status !== "active") continue;

      const countyMatch = await ctx.db
        .query("attorneyCounties")
        .withIndex("by_attorney_location", (q) => 
          q.eq("attorneyId", spec.attorneyId)
           .eq("county", args.county)
           .eq("state", args.state)
        )
        .first();

      if (countyMatch) {
        results.push({
          specialization: spec,
          attorney,
          county: countyMatch,
        });
      }
    }

    return results;
  },
});

export const getStats = query({
  handler: async (ctx) => {
    const attorneys = await ctx.db.query("attorneys").collect();

    const total = attorneys.length;
    const active = attorneys.filter(a => a.status === "active").length;
    const pending = attorneys.filter(a => a.status === "pending").length;
    const suspended = attorneys.filter(a => a.status === "suspended").length;

    const byTier = attorneys.reduce((acc, a) => {
      acc[a.subscriptionTier] = (acc[a.subscriptionTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      pending,
      suspended,
      byTier,
    };
  },
});

// =============================================================================
// ATTORNEY MUTATIONS
// =============================================================================

export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    barNumber: v.string(),
    firmName: v.string(),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    subscriptionTier: v.union(v.literal("basic"), v.literal("standard"), v.literal("premium")),
    maxLeadsPerDay: v.number(),
    specializations: v.array(v.object({
      caseType: v.string(),
      isPrimary: v.boolean(),
      yearsExperience: v.optional(v.number()),
    })),
    counties: v.array(v.object({
      county: v.string(),
      state: v.union(v.literal("NY"), v.literal("NJ")),
      priority: v.number(),
      isPrimaryOffice: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      role: "attorney",
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      isActive: true,
    });

    // Create attorney
    const attorneyId = await ctx.db.insert("attorneys", {
      userId,
      barNumber: args.barNumber,
      firmName: args.firmName,
      phone: args.phone,
      email: args.email,
      website: args.website,
      address: args.address,
      status: "pending",
      subscriptionTier: args.subscriptionTier,
      maxLeadsPerDay: args.maxLeadsPerDay,
      onboardingCompleted: false,
    });

    // Create specializations
    for (const spec of args.specializations) {
      await ctx.db.insert("attorneySpecializations", {
        attorneyId,
        caseType: spec.caseType,
        isPrimary: spec.isPrimary,
        yearsExperience: spec.yearsExperience,
      });
    }

    // Create counties
    for (const county of args.counties) {
      await ctx.db.insert("attorneyCounties", {
        attorneyId,
        county: county.county,
        state: county.state,
        priority: county.priority,
        isPrimaryOffice: county.isPrimaryOffice,
      });
    }

    return { attorneyId, userId };
  },
});

export const update = mutation({
  args: {
    id: v.id("attorneys"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.updates,
    });

    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("attorneys"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("suspended"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return { success: true };
  },
});

export const completeOnboarding = mutation({
  args: { id: v.id("attorneys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      onboardingCompleted: true,
      status: "active",
    });
    return { success: true };
  },
});
