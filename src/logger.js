let enabled = false;
class Logger {
  constructor(name) {
    this.prefix = name && name.length ? `prstatus(${name}):` : "prstatus:";
  }
  setDebug(param) {
    enabled =
      param === true ||
      (typeof param === "string" && param.toLowerCase() === "true");
  }

  log(...args) {
    console.log(this.prefix, ...args);
  }
  debug(...args) {
    if (enabled) console.log(this.prefix, ...args);
  }
  error(...args) {
    console.error(this.prefix, ...args);
  }
}

export default name => new Logger(name);
