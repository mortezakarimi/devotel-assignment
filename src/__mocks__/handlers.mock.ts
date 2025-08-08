import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';
faker.seed(123);
/**
 * Creates a mock job object following the structure of Provider 1's API.
 */
const createProvider1Job = () => ({
  jobId: `P1-${faker.string.alphanumeric(5)}`,
  title: faker.person.jobTitle(),
  details: {
    location: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
    type: faker.helpers.arrayElement(['Full-Time', 'Part-Time', 'Contract']),
    salaryRange: `$${faker.number.int({ min: 60, max: 90 })}k - $${faker.number.int({ min: 100, max: 180 })}k`,
  },
  company: {
    name: faker.company.name(),
    industry: faker.person.jobArea(),
  },
  skills: faker.helpers.arrayElements(
    ['JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'SQL'],
    { min: 2, max: 4 },
  ),
  postedDate: faker.date.recent({ days: 30 }).toISOString(),
});

/**
 * Creates a mock job object following the structure of Provider 2's API.
 */
const createProvider2Job = () => {
  const min = faker.number.int({ min: 50000, max: 80000 });
  const max = faker.number.int({ min: 90000, max: 200000 });
  return {
    position: faker.person.jobTitle(),
    location: {
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      remote: faker.datatype.boolean(),
    },
    compensation: {
      min,
      max,
      currency: 'USD',
    },
    employer: {
      companyName: faker.company.name(),
      website: faker.internet.url(),
    },
    requirements: {
      experience: faker.number.int({ min: 1, max: 10 }),
      technologies: faker.helpers.arrayElements(
        ['Java', 'Spring', 'Hibernate', 'PostgreSQL', 'K8s'],
        { min: 2, max: 4 },
      ),
    },
    datePosted: faker.date.recent({ days: 30 }).toISOString().split('T')[0], // Format as YYYY-MM-DD
  };
};

export const handlers = [
  // Handler for Provider 1 - returns a dynamic list of jobs
  http.get('https://assignment.devotel.io/api/provider1/jobs', () => {
    const jobs = faker.helpers.multiple(createProvider1Job, { count: 5 });
    return HttpResponse.json({
      metadata: {
        requestId: `req-${faker.string.alphanumeric(10)}`,
        timestamp: new Date().toISOString(),
      },
      jobs,
    });
  }),

  // Handler for Provider 2 - returns a dynamic list of jobs
  http.get('https://assignment.devotel.io/api/provider2/jobs', () => {
    const jobCount = 5;
    const jobsList: { [key: string]: any } = {};
    for (let i = 0; i < jobCount; i++) {
      jobsList[`job-${faker.string.alphanumeric(5)}`] = createProvider2Job();
    }
    return HttpResponse.json({
      status: 'success',
      data: { jobsList },
    });
  }),

  http.get('https://assignment.devotel.io/api/provider1/jobs-error', () => {
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500, statusText: 'Server blew up' },
    );
  }),

  http.get('https://assignment.devotel.io/api/provider1/jobs-empty', () => {
    return HttpResponse.json({
      metadata: {
        requestId: `req-${faker.string.alphanumeric(10)}`,
        timestamp: new Date().toISOString(),
      },
      jobs: [], // Return an empty array
    });
  }),
];
