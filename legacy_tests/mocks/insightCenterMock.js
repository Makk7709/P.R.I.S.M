export const createInsightCenterMock = () => {
  let timelineEvents = [];
  let container = document.createElement('div');
  container.style.display = 'none';
  let activeFilters = new Set();

  const mock = {
    container,
    get timelineEvents() {
      return timelineEvents;
    },
    updateTimeline: jest.fn().mockImplementation((events) => {
      timelineEvents = [...events];
      return Promise.resolve(timelineEvents);
    }),
    toggleEventFilter: jest.fn().mockImplementation((type) => {
      if (activeFilters.has(type)) {
        activeFilters.delete(type);
      } else {
        activeFilters.add(type);
      }
      return Promise.resolve([...activeFilters]);
    }),
    handleDirectiveIssued: jest.fn().mockImplementation((directive) => {
      timelineEvents.push(directive);
      return Promise.resolve(timelineEvents);
    }),
    toggleVisibility: jest.fn().mockImplementation(() => {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }),
    destroy: jest.fn()
  };

  return mock;
}; 