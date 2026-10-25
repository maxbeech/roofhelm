/**
 * Browser-side Sentry noise filters. Wired into `ignoreErrors` in instrumentation-client.ts.
 *
 * "Object Not Found Matching Id:1, MethodName:update, ParamCount:4" is thrown by a
 * browser's injected bridge (a translation, reader or in-app-browser script
 * calling a native `update` method that has gone), rejected as a bare string
 * with no stack. It never runs our code and there is nothing here to fix.
 */
export const CLIENT_IGNORED_ERROR_PATTERNS: RegExp[] = [/Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/];
