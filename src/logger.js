let enabled = false;
class Logger {
  constructor(name) {
    this.prefix = name && name.length ? `prstatus(${name}):` : "prstatus:";
  }
  enableDebug(param) {
    if (
      !param ||
      param === true ||
      (typeof params === "string" && param.toLoweCase() === "true")
    )
      enabled = true;
  }

  disableDebug() {
    enabled = false;
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
