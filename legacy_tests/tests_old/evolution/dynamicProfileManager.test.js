const { DynamicProfileManager, TaskCategory, UserType } = require('../../evolution/dynamicProfileManager');

describe('DynamicProfileManager', () => {
  let profileManager;

  beforeEach(() => {
    profileManager = new DynamicProfileManager();
  });

  describe('createProfile', () => {
    it('should create a new profile with default values', () => {
      const profile = profileManager.createProfile('user123');
      expect(profile).toHaveProperty('userId', 'user123');
      expect(profile).toHaveProperty('taskPreferences');
      expect(profile).toHaveProperty('expectedKeywords');
      expect(profile).toHaveProperty('performanceMetrics');
      expect(profile.context).toHaveProperty('userType', UserType.GENERAL);
    });

    it('should create a profile with custom initial context', () => {
      const initialContext = {
        userType: UserType.DEVELOPER,
        preferredProviders: ['openai', 'claude'],
        costSensitivity: 'high',
        responseTimeRequirement: 'fast',
        truthfulnessRequirement: 'high'
      };
      const profile = profileManager.createProfile('user123', initialContext);
      expect(profile.context).toMatchObject(initialContext);
    });
  });

  describe('getProfile', () => {
    it('should return existing profile', () => {
      const profile = profileManager.createProfile('user123');
      const retrievedProfile = profileManager.getProfile('user123');
      expect(retrievedProfile).toBe(profile);
    });

    it('should create new profile if not exists', () => {
      const profile = profileManager.getProfile('user123');
      expect(profile).toHaveProperty('userId', 'user123');
    });
  });

  describe('updateProfile', () => {
    it('should update task preferences', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        success: true,
        responseTime: 1000,
        response: 'Analysis result'
      };
      const profile = profileManager.updateProfile('user123', taskResult);
      expect(profile.taskPreferences[TaskCategory.ANALYSIS]).toBeDefined();
      expect(profile.taskPreferences[TaskCategory.ANALYSIS].count).toBe(1);
    });

    it('should update expected keywords', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        success: true,
        responseTime: 1000,
        response: 'Analysis result with important keywords'
      };
      const profile = profileManager.updateProfile('user123', taskResult);
      expect(profile.expectedKeywords.size).toBeGreaterThan(0);
    });

    it('should update performance metrics', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        success: true,
        responseTime: 1000,
        response: 'Analysis result'
      };
      const profile = profileManager.updateProfile('user123', taskResult);
      expect(profile.performanceMetrics.successRate).toBeGreaterThan(0);
      expect(profile.performanceMetrics.averageResponseTime).toBe(1000);
    });
  });

  describe('determineTaskCategory', () => {
    it('should correctly identify research tasks', () => {
      const category = profileManager.determineTaskCategory('research about AI');
      expect(category).toBe(TaskCategory.RESEARCH);
    });

    it('should correctly identify analysis tasks', () => {
      const category = profileManager.determineTaskCategory('analyze this data');
      expect(category).toBe(TaskCategory.ANALYSIS);
    });

    it('should correctly identify generation tasks', () => {
      const category = profileManager.determineTaskCategory('generate a report');
      expect(category).toBe(TaskCategory.GENERATION);
    });
  });

  describe('getAdaptiveContext', () => {
    it('should return adaptive context for user', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        success: true,
        responseTime: 1000,
        response: 'Analysis result'
      };
      profileManager.updateProfile('user123', taskResult);
      
      const context = profileManager.getAdaptiveContext('user123', 'analyze more data');
      expect(context).toHaveProperty('taskCategory', TaskCategory.ANALYSIS);
      expect(context).toHaveProperty('expectedKeywords');
      expect(context).toHaveProperty('taskPreferences');
    });
  });

  describe('Event emission', () => {
    it('should emit profileUpdated event', (done) => {
      profileManager.on('profileUpdated', ({ userId, profile }) => {
        expect(userId).toBe('user123');
        expect(profile).toBeDefined();
        done();
      });

      const taskResult = {
        taskDescription: 'analyze this data',
        success: true,
        responseTime: 1000,
        response: 'Analysis result'
      };
      profileManager.updateProfile('user123', taskResult);
    });
  });
}); 