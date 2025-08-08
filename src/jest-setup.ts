// This file configures the MSW server for all test runs.
import { server } from './__mocks__/server.mock';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
