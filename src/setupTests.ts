import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library's auto-cleanup relies on a globally available
// afterEach (present in Jest but not Vitest when globals are disabled).
// Register it explicitly so components are unmounted between tests.
afterEach(cleanup);
