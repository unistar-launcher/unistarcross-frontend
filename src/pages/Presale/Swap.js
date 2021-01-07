import React from 'react'
import ExchangePage from '../../components/Presale'

export default function Swap({ initialCurrency, params }) {
   const queryString = window.location.search.replace('?token=','');

   params = params ? params : {};
   console.log(params)
   params.tokenOutput = queryString;
  return <ExchangePage initialCurrency={initialCurrency} params={params} />
}
