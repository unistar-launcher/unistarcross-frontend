import React, { Suspense, lazy } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import config from '../../config'

// const Farms = lazy(() => import('./FarmsList'))
// const Staking = lazy(() => import('./Staking'))
// const BSCfarming = lazy(() => import('./BSCfarming'))


import Farms from './FarmsList'
import Swap from './Swap'

export default function Presale() {
  return (
    <>
      <Suspense fallback={null}>
        <Switch>
          <Route exact strict path="/presale" component={() => <Farms />} />

          <Route exact strict path={"/presale/sale"} component={() => <Swap />} />
      
          <Redirect to="/presale" />
        </Switch>
      </Suspense>
    </>
  )
}
