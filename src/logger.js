let enabled = false;
class Logger {
  enable() {
    enabled = true;
  }

  disable() {
    enabled = false;
  }

  log(...args) {
    console.log("prstatus:", ...args);
  }
  debug(...args) {
    if (enabled) console.log("prstatus:", ...args);
  }
  error(...args) {
    console.error("prstatus:", ...args);
  }
}

export default new Logger();
