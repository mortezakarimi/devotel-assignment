// This file sets up the MSW server instance.
import { setupServer } from 'msw/node';
import { handlers } from './handlers.mock';

export const server = setupServer(...handlers);
