export const reportRangeQuery = {
  from: { type: 'date' },
  to: { type: 'date' },
};

export const reportEmptyQuery = {};

export const reportGroupQuery = {
  group_by: {
    type: 'string',
    enum: ['day', 'week', 'month'],
  },
};
