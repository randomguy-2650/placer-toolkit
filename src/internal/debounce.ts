const TIMER_ID_KEY = Symbol();

export const debounce = (delay: number) => {
    return <T>(
        _target: T,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const fn = descriptor.value as (
            this: T & { [TIMER_ID_KEY]: number },
            ...args: unknown[]
        ) => unknown;

        descriptor.value = function (
            this: ThisParameterType<typeof fn>,
            ...args: Parameters<typeof fn>
        ) {
            clearTimeout(this[TIMER_ID_KEY]);

            this[TIMER_ID_KEY] = window.setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
    };
};
