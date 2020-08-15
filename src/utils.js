export const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      const tid = setTimeout(() => {
        func.apply(context, args);
        inThrottle = false;
      }, limit);
      inThrottle = true;
    }
  };
};
