const ProfileManager = require('../evolution/profileManager');

jest.mock('../evolution/logSummary');

describe('ProfileManager', () => {
  let profileManager;

  beforeEach(() => {
    profileManager = new ProfileManager();
    profileManager.initialize();
  });

  test('should initialize with default profiles', () => {
    const profiles = profileManager.listProfiles();
    expect(profiles).toHaveLength(3);
    expect(profiles.map(p => p.key)).toContain('standard');
    expect(profiles.map(p => p.key)).toContain('technical');
    expect(profiles.map(p => p.key)).toContain('creative');
  });

  test('should set standard profile as active by default', () => {
    const activeProfile = profileManager.getActiveProfile();
    expect(activeProfile.name).toBe('Standard');
  });

  test('should add new profile', () => {
    const newProfile = {
      name: 'Custom',
      keywords: ['custom', 'test'],
      forbiddenWords: ['test'],
      minLength: 100,
      maxLength: 500
    };

    profileManager.addProfile('custom', newProfile);
    const profiles = profileManager.listProfiles();
    expect(profiles).toHaveLength(4);
    expect(profiles.find(p => p.key === 'custom')).toBeDefined();
  });

  test('should not allow duplicate profile keys', () => {
    expect(() => {
      profileManager.addProfile('standard', {
        name: 'Duplicate',
        keywords: []
      });
    }).toThrow('Profile standard already exists');
  });

  test('should update existing profile', () => {
    const updates = {
      keywords: ['updated', 'test'],
      minLength: 200
    };

    profileManager.updateProfile('standard', updates);
    const updatedProfile = profileManager.getProfile('standard');
    expect(updatedProfile.keywords).toEqual(['updated', 'test']);
    expect(updatedProfile.minLength).toBe(200);
  });

  test('should not allow updating non-existent profile', () => {
    expect(() => {
      profileManager.updateProfile('nonexistent', {});
    }).toThrow('Profile nonexistent does not exist');
  });

  test('should change active profile', () => {
    profileManager.setActiveProfile('technical');
    const activeProfile = profileManager.getActiveProfile();
    expect(activeProfile.name).toBe('Technical');
  });

  test('should not allow setting non-existent profile as active', () => {
    expect(() => {
      profileManager.setActiveProfile('nonexistent');
    }).toThrow('Profile nonexistent does not exist');
  });

  test('should inject keywords into quality check function', () => {
    const mockQualityCheck = jest.fn();
    const injectedCheck = profileManager.injectKeywordsIntoQualityCheck(mockQualityCheck);
    
    const response = { text: 'Test response' };
    injectedCheck(response);
    
    expect(mockQualityCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: expect.any(Array),
        forbiddenWords: expect.any(Array),
        minLength: expect.any(Number),
        maxLength: expect.any(Number)
      })
    );
  });

  test('should throw error when getting active profile without initialization', () => {
    const newManager = new ProfileManager();
    expect(() => {
      newManager.getActiveProfile();
    }).toThrow('No active profile set');
  });
}); 