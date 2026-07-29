import { TierCalculator, Tier, NextTierInfo, TierName } from '@/lib/loyalty/tier-system'

describe('TierCalculator', () => {
  describe('calculateTier', () => {
    it('should return Bronze tier for score 0-25', () => {
      const tier = TierCalculator.calculateTier(0)
      expect(tier.tier_name).toBe('Bronze')
      expect(tier.base_discount_percent).toBe(0)
      expect(tier.points_min).toBe(0)
      expect(tier.points_max).toBe(25)
    })

    it('should return Bronze tier for score 25', () => {
      const tier = TierCalculator.calculateTier(25)
      expect(tier.tier_name).toBe('Bronze')
      expect(tier.base_discount_percent).toBe(0)
    })

    it('should return Silver tier for score 26', () => {
      const tier = TierCalculator.calculateTier(26)
      expect(tier.tier_name).toBe('Silver')
      expect(tier.base_discount_percent).toBe(5)
      expect(tier.points_min).toBe(26)
      expect(tier.points_max).toBe(50)
    })

    it('should return Silver tier for score 50', () => {
      const tier = TierCalculator.calculateTier(50)
      expect(tier.tier_name).toBe('Silver')
      expect(tier.base_discount_percent).toBe(5)
    })

    it('should return Gold tier for score 51', () => {
      const tier = TierCalculator.calculateTier(51)
      expect(tier.tier_name).toBe('Gold')
      expect(tier.base_discount_percent).toBe(10)
      expect(tier.points_min).toBe(51)
      expect(tier.points_max).toBe(75)
    })

    it('should return Gold tier for score 75', () => {
      const tier = TierCalculator.calculateTier(75)
      expect(tier.tier_name).toBe('Gold')
      expect(tier.base_discount_percent).toBe(10)
    })

    it('should return Platinum tier for score 76', () => {
      const tier = TierCalculator.calculateTier(76)
      expect(tier.tier_name).toBe('Platinum')
      expect(tier.base_discount_percent).toBe(15)
      expect(tier.points_min).toBe(76)
      expect(tier.points_max).toBe(100)
    })

    it('should return Platinum tier for score 100', () => {
      const tier = TierCalculator.calculateTier(100)
      expect(tier.tier_name).toBe('Platinum')
      expect(tier.base_discount_percent).toBe(15)
    })

    it('should include perks for each tier', () => {
      const bronze = TierCalculator.calculateTier(0)
      const silver = TierCalculator.calculateTier(26)
      const gold = TierCalculator.calculateTier(51)
      const platinum = TierCalculator.calculateTier(76)

      expect(bronze.perks.length).toBeGreaterThan(0)
      expect(silver.perks.length).toBeGreaterThan(bronze.perks.length)
      expect(gold.perks.length).toBeGreaterThan(silver.perks.length)
      expect(platinum.perks.length).toBeGreaterThan(gold.perks.length)
    })

    it('should throw error for invalid score (negative)', () => {
      expect(() => {
        TierCalculator.calculateTier(-1)
      }).toThrow('must be between 0 and 100')
    })

    it('should throw error for invalid score (above 100)', () => {
      expect(() => {
        TierCalculator.calculateTier(101)
      }).toThrow('must be between 0 and 100')
    })

    it('should throw error for non-number score', () => {
      expect(() => {
        TierCalculator.calculateTier('50' as any)
      }).toThrow('must be a number')
    })

    it('should throw error for NaN score', () => {
      expect(() => {
        TierCalculator.calculateTier(NaN)
      }).toThrow('must be a number')
    })

    it('should return loyalty_score in tier object', () => {
      const tier = TierCalculator.calculateTier(45)
      expect(tier.loyalty_score).toBe(45)
    })
  })

  describe('getNextTierInfo', () => {
    it('should show Silver as next tier for Bronze score', () => {
      const nextTier = TierCalculator.getNextTierInfo(15)
      expect(nextTier.current_tier).toBe('Bronze')
      expect(nextTier.next_tier).toBe('Silver')
      expect(nextTier.points_needed).toBe(11) // 26 - 15
      expect(nextTier.discount_gain).toBe(5) // 5 - 0
    })

    it('should show Gold as next tier for Silver score', () => {
      const nextTier = TierCalculator.getNextTierInfo(40)
      expect(nextTier.current_tier).toBe('Silver')
      expect(nextTier.next_tier).toBe('Gold')
      expect(nextTier.points_needed).toBe(11) // 51 - 40
      expect(nextTier.discount_gain).toBe(5) // 10 - 5
    })

    it('should show Platinum as next tier for Gold score', () => {
      const nextTier = TierCalculator.getNextTierInfo(65)
      expect(nextTier.current_tier).toBe('Gold')
      expect(nextTier.next_tier).toBe('Platinum')
      expect(nextTier.points_needed).toBe(11) // 76 - 65
      expect(nextTier.discount_gain).toBe(5) // 15 - 10
    })

    it('should show no next tier for Platinum score', () => {
      const nextTier = TierCalculator.getNextTierInfo(90)
      expect(nextTier.current_tier).toBe('Platinum')
      expect(nextTier.next_tier).toBeNull()
      expect(nextTier.points_needed).toBe(0)
      expect(nextTier.discount_gain).toBe(0)
    })

    it('should calculate points_needed at tier boundaries', () => {
      // At Bronze max (25), need 1 point to reach Silver min (26)
      const atBronzeMax = TierCalculator.getNextTierInfo(25)
      expect(atBronzeMax.points_needed).toBe(1)

      // At Silver max (50), need 1 point to reach Gold min (51)
      const atSilverMax = TierCalculator.getNextTierInfo(50)
      expect(atSilverMax.points_needed).toBe(1)

      // At Gold max (75), need 1 point to reach Platinum min (76)
      const atGoldMax = TierCalculator.getNextTierInfo(75)
      expect(atGoldMax.points_needed).toBe(1)
    })

    it('should throw error for invalid score (negative)', () => {
      expect(() => {
        TierCalculator.getNextTierInfo(-1)
      }).toThrow('must be between 0 and 100')
    })

    it('should throw error for invalid score (above 100)', () => {
      expect(() => {
        TierCalculator.getNextTierInfo(101)
      }).toThrow('must be between 0 and 100')
    })

    it('should throw error for non-number score', () => {
      expect(() => {
        TierCalculator.getNextTierInfo('50' as any)
      }).toThrow('must be a number')
    })

    it('should throw error for NaN score', () => {
      expect(() => {
        TierCalculator.getNextTierInfo(NaN)
      }).toThrow('must be a number')
    })
  })

  describe('isValidTierName', () => {
    it('should validate correct tier names', () => {
      expect(TierCalculator.isValidTierName('Bronze')).toBe(true)
      expect(TierCalculator.isValidTierName('Silver')).toBe(true)
      expect(TierCalculator.isValidTierName('Gold')).toBe(true)
      expect(TierCalculator.isValidTierName('Platinum')).toBe(true)
    })

    it('should reject invalid tier names', () => {
      expect(TierCalculator.isValidTierName('bronze')).toBe(false)
      expect(TierCalculator.isValidTierName('Diamond')).toBe(false)
      expect(TierCalculator.isValidTierName('Premium')).toBe(false)
      expect(TierCalculator.isValidTierName('')).toBe(false)
    })
  })

  describe('getAllTiers', () => {
    it('should return all four tiers', () => {
      const allTiers = TierCalculator.getAllTiers()
      expect(allTiers).toHaveLength(4)
      expect(allTiers[0].tier_name).toBe('Bronze')
      expect(allTiers[1].tier_name).toBe('Silver')
      expect(allTiers[2].tier_name).toBe('Gold')
      expect(allTiers[3].tier_name).toBe('Platinum')
    })

    it('should have increasing discounts', () => {
      const allTiers = TierCalculator.getAllTiers()
      for (let i = 1; i < allTiers.length; i++) {
        expect(allTiers[i].base_discount_percent).toBeGreaterThan(
          allTiers[i - 1].base_discount_percent
        )
      }
    })
  })
})
