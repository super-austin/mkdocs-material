/*
 * Copyright (c) 2016-2019 Martin Donath <martin.donath@squidfunk.com>
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

import {
  EMPTY,
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  combineLatest,
  of,
  pipe
} from "rxjs"
import {
  filter,
  map,
  switchMap,
  takeUntil,
  withLatestFrom
} from "rxjs/operators"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Toggle switch map with another observable
 *
 * @template T - Source value type
 * @template U - Target value type
 *
 * @param toggle$ - Toggle observable
 * @param project - Projection
 *
 * @return Operator function
 */
export function switchMapIf<T, U>(
  toggle$: Observable<boolean>, project: (value: T) => Observable<U>
): OperatorFunction<T, U> {
  const begin$ = toggle$.pipe(filter(value =>  value))
  const end$   = toggle$.pipe(filter(value => !value))
  return pipe(
    switchMap(value => combineLatest([of(value), begin$])),
    switchMap(([value, active]) => active
      ? project(value)
          .pipe(
            takeUntil(end$)
          )
      : EMPTY
    )
  )
}

/**
 * Toggle emission with another observable
 *
 * @template T - Value type
 *
 * @param toggle$ - Toggle observable
 *
 * @return Operator function
 */
export function takeIf<T>(
  toggle$: Observable<boolean>
): MonoTypeOperatorFunction<T> {
  return pipe(
    withLatestFrom(toggle$),
    filter(([, active]) => active),
    map(([value]) => value)
  )
}
