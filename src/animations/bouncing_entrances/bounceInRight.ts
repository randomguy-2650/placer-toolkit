export const bounceInRight = [
    {
        offset: 0,
        opacity: "0",
        transform: "translate3d(3000px, 0, 0) scaleX(3)",
    },
    { offset: 0, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
    {
        offset: 0.6,
        opacity: "1",
        transform: "translate3d(-25px, 0, 0) scaleX(1)",
    },
    { offset: 0.6, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
    { offset: 0.75, transform: "translate3d(10px, 0, 0) scaleX(0.98)" },
    { offset: 0.75, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
    { offset: 0.9, transform: "translate3d(-5px, 0, 0) scaleX(0.995)" },
    { offset: 0.9, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
    { offset: 1, transform: "translate3d(0, 0, 0)" },
    { offset: 1, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
];
