export const zoomOutUp = [
    {
        offset: 0.4,
        opacity: "1",
        transform: "scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0)",
        easing: "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
    },
    {
        offset: 1,
        opacity: "0",
        transform: "scale3d(0.1, 0.1, 0.1) translate3d(0, -2000px, 0)",
        easing: "cubic-bezier(0.175, 0.885, 0.32, 1)",
    },
];
