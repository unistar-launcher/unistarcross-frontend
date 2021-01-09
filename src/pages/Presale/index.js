import React, { Suspense, lazy } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'

import PresalePool from './PresaleList'
import Swap from './Swap'

export default function Presale() {
  return (
    <>
      <Suspense fallback={null}>
        <Switch>
          <Route exact strict path="/presale" component={() => <PresalePool />} />
          <Route exact strict path={"/presale/sale"} component={() => <Swap />} />
          <Redirect to="/presale" />
        </Switch>
      </Suspense>
    </>
  )
}
