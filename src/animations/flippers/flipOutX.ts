export const flipOutX = [
    { offset: 0, transform: "perspective(400px)" },
    {
        offset: 0.3,
        transform: "perspective(400px) rotate3d(1, 0, 0, -20deg)",
        opacity: "1",
    },
    {
        offset: 1,
        transform: "perspective(400px) rotate3d(1, 0, 0, 90deg)",
        opacity: "0",
    },
];
