import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@elder-first/api/src/routers';

export const trpc = createTRPCReact<AppRouter>();
