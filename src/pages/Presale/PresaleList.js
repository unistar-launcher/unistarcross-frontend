import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { NavLink } from 'react-router-dom'
import { ethers } from 'ethers'

import { INITIAL_TOKENS_CONTEXT } from '../../contexts/Tokens/index.js'

import MasterChef from '../../constants/abis/MasterChef.json'
import ERC20_ABI from '../../constants/abis/erc20'
import STAKE_ABI from '../../constants/abis/Stake.json'
import EXCHANGE_ABI from '../../constants/abis/exchange'

import { chainInfo } from '../../config/coinbase/nodeConfig'
import config from '../../config'

import { getNetwork } from '../../config/getUrlParams'

const INIT_NODE = 'ETH_MAIN'
const ENV_NODE_CONFIG = 'ENV_NODE_CONFIG'
let ENV_CONFIG = getNetwork(ENV_NODE_CONFIG, INIT_NODE)

let tokenSailorMoon = '0x514910771af9ca656af840dff83e8264ecf986ca';
let tokenNeumekca = '0x522DE80C85B8a736A19e1D073c849EF6a7f055A6';

function InitToken() {
  switch (ENV_CONFIG) {
    case 'BNB_MAIN':
      console.log('BNB_MAIN');
      tokenSailorMoon = '0xe4ae305ebe1abe663f261bc00534067c80ad677c';
     
      break;
    case 'HT_MAIN':
      console.log('HT_MAIN');
      tokenSailorMoon = '0xecb56cf772b5c9a6907fb7d32387da2fcbfb63b4';
      break;
    case 'ETH_MAIN':
      console.log('ETH_MAIN');
      tokenSailorMoon = '0x6b175474e89094c44da98b954eedeac495271d0f';
      tokenNeumekca = '0x522DE80C85B8a736A19e1D073c849EF6a7f055A6';
      break;
  }
}

InitToken();

const PresalePoolBox = styled.div`
  ${({ theme }) => theme.FlexSC};
  flex-wrap:wrap;
  width: 100%;
  margin-top:20px;
`

const PresalePool = styled.div`
width: 50%;
height: 220px;
margin-bottom: 20px;
.default {
  background: linear-gradient(180deg, #81BEFA 0%, #4A8AF4 100%);
}
&:nth-child(2n) {
  padding-left: 10px;
}
&:nth-child(2n-1) {
  padding-right: 10px;
}
&:nth-child(4n + 1) {
  .default {
    background: ${({ theme }) => theme.gradientPurpleLR};
  }
}
&:nth-child(4n + 4) {
  .default {
    background: ${({ theme }) => theme.gradientPurpleLR};
  }
}
@media screen and (max-width: 960px) {
  width: 100%;
  &:nth-child(2n) {
    padding-left: 0px;
  }
  &:nth-child(2n-1) {
    padding-right: 0px;
  }
}
`

const StyledNavLink = styled(NavLink)`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.contentBg};
  box-shadow: 0.4375rem 0.125rem 1.625rem 0 rgba(0, 0, 0, 0.06);
  display:block;
  border-radius: 10px;
  text-decoration: none;
  .default {
    ${({ theme }) => theme.FlexC};
    flex-wrap:wrap;
    width:100%;
    height:100%;
    padding: 22px 10px 0;
    border-radius: 10px;
    .img {
      ${({ theme }) => theme.FlexC};
      height:82px;
      border-radius:100%;
      margin:auth;
      img {
        display:block;
        height:100%;
      }
    }
    .info {
      width:100%;
      text-align:center;
      margin:0px 0 0;
      h3 {
        color: #fff;
        font-size:18px;
        margin:0;
        font-weight: 800;
      }
      p {
        color: #fff;
        font-size:14px;
        margin:0;
        padding:0;
        line-height: 35px;
        .pecent {
          padding: 2px 3px;
          background: #14A15E;
          border-radius:4px;
          display:inline-block;
          margin-left: 5px;
          line-height: 21px;
        }
      }
    }
  }
`



const Web3Fn = require('web3')

export default function FarmsList() {

  return (
    <>
      <PresalePoolBox>
        <PresalePool>
          <StyledNavLink to={'/presale/sale?token=' + tokenNeumekca}>
            <div className='default'>
              <div className='img'><img src={require('../../assets/images/icon/neumekca-logo.png')} alt="" /></div>
              <div className='info'>
                <h3>Neumékca City</h3>
              </div>
            </div>
          </StyledNavLink>
        </PresalePool>
      </PresalePoolBox>
    </>
  )
}