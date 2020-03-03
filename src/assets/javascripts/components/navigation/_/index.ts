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

import { Observable, OperatorFunction, pipe } from "rxjs"
import { map, switchMap } from "rxjs/operators"

import { Viewport, getElements } from "observables"

import { Header } from "../../header"
import { Main } from "../../main"
import {
  Sidebar,
  paintSidebar,
  watchSidebar
} from "../../shared"
import {
  NavigationLayer,
  paintNavigationLayer,
  watchNavigationLayer
} from "../layer"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Navigation for [screen -]
 */
interface NavigationBelowScreen {
  layer: NavigationLayer               /* Active layer */
}

/**
 * Navigation for [screen +]
 */
interface NavigationAboveScreen {
  sidebar: Sidebar                     /* Sidebar */
}

/* ------------------------------------------------------------------------- */

/**
 * Navigation
 */
export type Navigation =
  | NavigationBelowScreen
  | NavigationAboveScreen

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Mount options
 */
interface MountOptions {
  header$: Observable<Header>          /* Header observable */
  main$: Observable<Main>              /* Main area observable */
  viewport$: Observable<Viewport>      /* Viewport observable */
  screen$: Observable<boolean>         /* Screen media observable */
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Mount navigation from source observable
 *
 * @param options - Options
 *
 * @return Operator function
 */
export function mountNavigation(
  { header$, main$, viewport$, screen$ }: MountOptions
): OperatorFunction<HTMLElement, Navigation> {
  return pipe(
    switchMap(el => screen$
      .pipe(
        switchMap(screen => {

          /* [screen +]: Mount navigation in sidebar */
          if (screen) {
            return watchSidebar(el, { main$, viewport$ })
              .pipe(
                paintSidebar(el, { header$ }),
                map(sidebar => ({ sidebar }))
              )

          /* [screen -]: Mount navigation in drawer */
          } else {
            const els = getElements("nav", el)
            return watchNavigationLayer(els)
              .pipe(
                paintNavigationLayer(els),
                map(layer => ({ layer }))
              )
          }
        })
      )
    )
  )
}
