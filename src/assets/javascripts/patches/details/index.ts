/*
 * Copyright (c) 2016-2020 Martin Donath <martin.donath@squidfunk.com>
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

import { identity } from "ramda"
import { Observable, fromEvent, merge } from "rxjs"
import {
  filter,
  map,
  shareReplay,
  switchMapTo,
  tap
} from "rxjs/operators"

import { getElements, watchMedia } from "observables"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Mount options
 */
interface MountOptions {
  document$: Observable<Document>      /* Document observable */
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Patch all `details` elements
 *
 * This function will ensure that all `details` tags are opened prior to
 * printing, so the whole content of the page is included.
 *
 * @param options - Options
 *
 * @return Details elements observable
 */
export function patchDetails(
  { document$ }: MountOptions
): Observable<HTMLDetailsElement[]> {
  return merge(
    watchMedia("print").pipe(filter(identity)), // Webkit
    fromEvent(window, "beforeprint")            // IE, FF
  )
    .pipe(
      switchMapTo(document$),
      map(() => getElements<HTMLDetailsElement>("details")),
      tap(els => {
        for (const detail of els)
          detail.setAttribute("open", "")
      }),
      shareReplay(1)
    )
}
