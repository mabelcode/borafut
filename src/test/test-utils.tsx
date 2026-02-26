import React, { type ReactElement } from 'react'
import { render, renderHook, type RenderOptions, type RenderHookOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // Turn off retries for tests
        },
    },
})

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = React.useState(() => createTestQueryClient())
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

function customRenderHook<Result, Props>(
    renderCallback: (initialProps: Props) => Result,
    options?: Omit<RenderHookOptions<Props>, 'wrapper'>,
) {
    return renderHook(renderCallback, { wrapper: AllTheProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render, customRenderHook as renderHook }
