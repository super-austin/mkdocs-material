/*
 * Copyright (c) 2016 Martin Donath <martin.donath@squidfunk.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/* ----------------------------------------------------------------------------
 * Class
 * ------------------------------------------------------------------------- */

export default class Listener {

  /**
   * Generic event listener
   *
   * @constructor
   * @param {(string|NodeList<HTMLElement>)} els - Selector or HTML elements
   * @param {Array.<string>} events - Event names
   * @param {(object|function)} handler - Handler to be invoked
   */
  constructor(els, events, handler) {
    this.els_ = (typeof els === "string")
      ? document.querySelectorAll(els)
      : [].concat(els)

    /* Set handler as function or directly as object */
    this.handler_ = typeof handler === "function"
      ? { update: handler }
      : handler

    /* Initialize event names and update handler */
    this.events_ = [].concat(events)
    this.update_ = ev => this.handler_.update(ev)
  }

  /**
   * Register listener for all relevant events
   */
  listen() {
    for (const el of this.els_)
      for (const event of this.events_)
        el.addEventListener(event, this.update_, false)

    /* Execute setup handler, if implemented */
    if (typeof this.handler_.setup === "function")
      this.handler_.setup()
  }

  /**
   * Unregister listener for all relevant events
   */
  unlisten() {
    for (const el of this.els_)
      for (const event of this.events_)
        el.removeEventListener(event, this.update_)

    /* Execute reset handler, if implemented */
    if (typeof this.handler_.reset === "function")
      this.handler_.reset()
  }
}
