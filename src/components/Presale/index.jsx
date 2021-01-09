import React, { useState, useReducer, useEffect } from 'react'
import { ethers } from 'ethers'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import { useWeb3React } from '../../hooks'
import { brokenTokens } from '../../constants'
import { amountFormatter, calculateGasMargin, isAddress } from '../../utils'

import { useExchangeContract } from '../../hooks'
import { useTokenDetails, INITIAL_TOKENS_CONTEXT } from '../../contexts/Tokens/index.js'
import { useTransactionAdder } from '../../contexts/Transactions'
import { useAddressBalance, useExchangeReserves } from '../../contexts/Balances'
import { useAddressAllowance } from '../../contexts/Allowances'
import { useWalletModalToggle } from '../../contexts/Application'

import { Button } from '../../theme'
 import CurrencyInputPanel from './CurrencyInputPanel'
import AddressInputPanel from '../AddressInputPanel'
import OversizedPanel from '../OversizedPanel'
import TransactionDetails from '../TransactionDetails'
import WarningCard from '../WarningCard'
import config from '../../config'

import {getWeb3ConTract, getWeb3BaseInfo} from '../../utils/web3/txns'
import PRESALE_ABI from '../../constants/abis/presale'

import HardwareTip from '../HardwareTip'

import { ReactComponent as Dropup } from '../../assets/images/dropup-blue.svg'
import { ReactComponent as Dropdown } from '../../assets/images/dropdown-blue.svg'
import SwapWhiteIcon from '../../assets/images/icon/swap-white.svg'
import SendWhiteIcon from '../../assets/images/icon/send-white.svg'

import { useBetaMessageManager } from '../../contexts/LocalStorage'
import WarningTip from '../WarningTip'

import {recordTxns} from '../../utils/records'

import Title from '../Title'



const INPUT = 0
const OUTPUT = 1

const ETH_TO_TOKEN = 0
const TOKEN_TO_ETH = 1
const TOKEN_TO_TOKEN = 2

// denominated in bips
const ALLOWED_SLIPPAGE_DEFAULT = 50
const TOKEN_ALLOWED_SLIPPAGE_DEFAULT = 50

// 15 minutes, denominated in seconds
const DEFAULT_DEADLINE_FROM_NOW = 60 * 15

// % above the calculated gas cost that we actually send, denominated in bips
const GAS_MARGIN = ethers.utils.bigNumberify(1000)

const DownArrowBackground = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  margin: 3px auto;
  cursor:pointer;
  background: ${({ theme }) => theme.swapBg}
`

const DownArrow = styled.div`
  width: 32px;
  height: 32px;
  padding:8px;
  margin: 3px auto;
  cursor: pointer;
  background: rgba(255,255,255,.3);
  img {
    height: 100%;
    display: block;
  }
`
const ExchangeRateWrapperBox = styled.div`
${({ theme }) => theme.FlexBC};
width: 100%;
height: 48px;
object-fit: contain;
border-radius: 0.5625rem;
background: ${({ theme }) => theme.tipContentBg};
padding: 0 2.5rem;
margin-top:0.625rem;
@media screen and (max-width: 960px) {
  padding:0;
  height: auto;
  justify-content:center;;
  background: none;
  flex-wrap:wrap;
  flex-direction: column;
}
`

const ExchangeRateWrapper = styled.div`
${({ theme }) => theme.FlexEC};
  width: 100%;
  font-family: 'Manrope';
  font-size: 0.75rem;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-align: right;
  color: ${({ theme }) => theme.textColorBold};
  span {
    height: 0.75rem;
    font-size: 0.75rem;
    font-weight: 800;
    font-stretch: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-align: right;
    color: ${({ theme }) => theme.textColorBold};
  }
  @media screen and (max-width: 960px) {
    width: 100%;
    background-color: ${({ theme }) => theme.tipContentBg};
    padding: 8px 1rem;
    ${({ theme }) => theme.FlexSC};
  }
`

const ExchangeRate = styled.div`
  flex: 1 1 auto;
  width: 0;
  color: ${({ theme }) => theme.doveGray};
`

const Flex = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;

  button {
    max-width: 20rem;
  }
`
const WrappedDropup = ({ isError, highSlippageWarning, ...rest }) => <Dropup {...rest} />
const ColoredDropup = styled(WrappedDropup)`
margin-right: 0.625rem;
  path {
    stroke: ${({ theme }) => theme.royalBlue};
  }
`

const WrappedDropdown = ({ isError, highSlippageWarning, ...rest }) => <Dropdown {...rest} />
const ColoredDropdown = styled(WrappedDropdown)`
margin-right: 0.625rem;
  path {
    stroke: ${({ theme }) => theme.royalBlue};
  }
`
const TxnsDtilBtn = styled.div`
  ${({ theme }) => theme.FlexC};
  height: 34px;
  object-fit: contain;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.moreBtn};
  font-family: 'Manrope';
  font-size: 0.75rem;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  color: #734be2;
  cursor:pointer;
  padding: 0 0.625rem;
  .left {
    
  }
  .red {
    color:red;
  }
  .slippage {
    ${({ theme }) => theme.FlexC};
    height: 100%;
    font-size: 0.75rem;
    font-weight: 600;
    font-stretch: normal;
    font-style: normal;
    line-height: 0.83;
    letter-spacing: normal;
    color: ${({ theme }) => theme.textColorBold};
    padding-left:0.75rem;
    border-left:0.0625rem solid ${({ theme }) => theme.tipContentBg};
    img {
      margin-right: 0.4375rem;
    }
  }
  @media screen and (max-width: 960px) {
    padding: 8px 0.625rem;
    height: auto;
    marign: auto;
    margin-bottom:0.625rem;
  }
`

function calculateSlippageBounds(value, token = false, tokenAllowedSlippage, allowedSlippage) {
  if (value) {
    const offset = value.mul(token ? tokenAllowedSlippage : allowedSlippage).div(ethers.utils.bigNumberify(10000))
    const minimum = value.sub(offset)
    const maximum = value.add(offset)
    return {
      minimum: minimum.lt(ethers.constants.Zero) ? ethers.constants.Zero : minimum,
      maximum: maximum.gt(ethers.constants.MaxUint256) ? ethers.constants.MaxUint256 : maximum
    }
  } else {
    return {}
  }
}

function getSwapType(inputCurrency, outputCurrency) {
  if (!inputCurrency || !outputCurrency) {
    return null
  } else if (inputCurrency === config.symbol) {
    return ETH_TO_TOKEN
  } else if (outputCurrency === config.symbol) {
    return TOKEN_TO_ETH
  } else {
    return TOKEN_TO_TOKEN
  }
}

// this mocks the getInputPrice function, and calculates the required output
function calculateEtherTokenOutputFromInput(inputAmount, inputReserve, outputReserve) {
  var presaleRate = getExchangeRate();
  console.log(presaleRate);
  const result = inputAmount.div(ethers.utils.bigNumberify(presaleRate));
  return result;
}

// this mocks the getOutputPrice function, and calculates the required input
function calculateEtherTokenInputFromOutput(outputAmount, inputReserve, outputReserve) {
  var presaleRate = getExchangeRate();
  const result = outputAmount.mul(ethers.utils.bigNumberify(presaleRate));
  return result;
}

function getInitialSwapState(state) {
  return {
    independentValue: state.exactFieldURL && state.exactAmountURL ? state.exactAmountURL : '', // this is a user input
    dependentValue: '', // this is a calculated number
    independentField: state.exactFieldURL === 'output' ? OUTPUT : INPUT,
    inputCurrency: state.inputCurrencyURL ? state.inputCurrencyURL : state.outputCurrencyURL === config.symbol ? '' : config.symbol,
    outputCurrency: state.outputCurrencyURL
      ? state.outputCurrencyURL === config.symbol
        ? !state.inputCurrencyURL || (state.inputCurrencyURL && state.inputCurrencyURL !== config.symbol)
          ? config.symbol
          : ''
        : state.outputCurrencyURL
      : state.initialCurrency
      ? state.initialCurrency
      : config.initToken
  }
}

function swapStateReducer(state, action) {
  switch (action.type) {
    case 'FLIP_INDEPENDENT': {
      const { independentField, inputCurrency, outputCurrency } = state
      return {
        ...state,
        dependentValue: '',
        independentField: independentField === INPUT ? OUTPUT : INPUT,
        inputCurrency: outputCurrency,
        outputCurrency: inputCurrency
      }
    }
    case 'SELECT_CURRENCY': {
      const { inputCurrency, outputCurrency } = state
      const { field, currency } = action.payload
      const newInputCurrency = field === INPUT ? currency : inputCurrency
      const newOutputCurrency = field === OUTPUT ? currency : outputCurrency

      if (newInputCurrency === newOutputCurrency) {
        return {
          ...state,
          inputCurrency: field === INPUT ? currency : '',
          outputCurrency: field === OUTPUT ? currency : ''
        }
      } else {
        return {
          ...state,
          inputCurrency: newInputCurrency,
          outputCurrency: newOutputCurrency
        }
      }
    }
    case 'UPDATE_INDEPENDENT': {
      const { field, value } = action.payload
      const { dependentValue, independentValue } = state
      return {
        ...state,
        independentValue: value,
        dependentValue: value === independentValue ? dependentValue : '',
        independentField: field
      }
    }
    case 'UPDATE_DEPENDENT': {
      return {
        ...state,
        dependentValue: action.payload
      }
    }
    default: {
      return getInitialSwapState()
    }
  }
}

function getExchangeRate() {
  try {
      var presaleRate = web3Contract.methods.getPresaleRate().encodeABI();
      return presaleRate;
  } catch {}
}

function getMarketRate(
  swapType,
  inputReserveETH,
  inputReserveToken,
  inputDecimals,
  outputReserveETH,
  outputReserveToken,
  outputDecimals,
  invert = false
) {
  return getExchangeRate()
}

// export default function ExchangePage({ initialCurrency, sending = false, params }) {
export default function ExchangePage({ initialCurrency, params }) {
  const { t } = useTranslation()
  let { account, chainId, error } = useWeb3React()
  const [showBetaMessage] = useBetaMessageManager()
  let walletType = sessionStorage.getItem('walletType')
  let HDPath = sessionStorage.getItem('HDPath')
  params = params ? params : {}
  // account = config.supportWallet.includes(walletType) ? sessionStorage.getItem('account') : account
  const urlAddedTokens = {}
  if (params && params.inputCurrency) {
    urlAddedTokens[params.inputCurrency] = true
  }
  if (params && params.outputCurrency) {
    urlAddedTokens[params.outputCurrency] = true
  }
  if (params && params.tokenAddress) {
    urlAddedTokens[params.tokenAddress] = true
  }
  if (isAddress(initialCurrency)) {
    urlAddedTokens[initialCurrency] = true
  }

  const addTransaction = useTransactionAdder()

  // check if URL specifies valid slippage, if so use as default
  const initialSlippage = (token = false) => {
    let slippage = Number.parseInt(params.slippage)
    if (!isNaN(slippage) && (slippage === 0 || slippage >= 1)) {
      return slippage // round to match custom input availability
    }
    // check for token <-> token slippage option
    return token ? TOKEN_ALLOWED_SLIPPAGE_DEFAULT : ALLOWED_SLIPPAGE_DEFAULT
  }

  // check URL params for recipient, only on send page
  const initialRecipient = () => {
    if (sending && params.recipient) {
      return params.recipient
    }
    return ''
  }

  const [sending, setSending] = useState(false)

  const [brokenTokenWarning, setBrokenTokenWarning] = useState()

  const [deadlineFromNow, setDeadlineFromNow] = useState(DEFAULT_DEADLINE_FROM_NOW)

  const [rawSlippage, setRawSlippage] = useState(() => initialSlippage())
  const [rawTokenSlippage, setRawTokenSlippage] = useState(() => initialSlippage(true))

  const allowedSlippageBig = ethers.utils.bigNumberify(rawSlippage)
  const tokenAllowedSlippageBig = ethers.utils.bigNumberify(rawTokenSlippage)

  // analytics
  // useEffect(() => {
  //   ReactGA.pageview(window.location.pathname + window.location.search)
  // }, [])

  // core swap state
  const [swapState, dispatchSwapState] = useReducer(
    swapStateReducer,
    {
      initialCurrency: initialCurrency,
      inputCurrencyURL: params.inputCurrency,
      outputCurrencyURL: params.tokenOutput,//params.outputCurrency || params.tokenAddress,
      exactFieldURL: params.exactField,
      exactAmountURL: params.exactAmount
    },
    getInitialSwapState
  )
  const { independentValue, dependentValue, independentField, inputCurrency, outputCurrency } = swapState

  useEffect(() => {
    setBrokenTokenWarning(false)
    for (let i = 0; i < brokenTokens.length; i++) {
      if (
        brokenTokens[i].toLowerCase() === outputCurrency.toLowerCase() ||
        brokenTokens[i].toLowerCase() === inputCurrency.toLowerCase()
      ) {
        setBrokenTokenWarning(true)
      }
    }
  }, [outputCurrency, inputCurrency])

  const [recipient, setRecipient] = useState({
    address: initialRecipient(),
    name: ''
  })
  const [recipientError, setRecipientError] = useState()

  // get swap type from the currency types
  const swapType = getSwapType(inputCurrency, outputCurrency)

  // get decimals and exchange address for each of the currency types
  const { symbol: inputSymbol, decimals: inputDecimals, exchangeAddress: inputExchangeAddress, isSwitch: inputIsSwitch } = useTokenDetails(
    inputCurrency
  )
  const { symbol: outputSymbol, decimals: outputDecimals, exchangeAddress: outputExchangeAddress, isSwitch: outputIsSwitch } = useTokenDetails(
    outputCurrency
  )

  const inputExchangeContract = useExchangeContract(inputExchangeAddress)
  const outputExchangeContract = useExchangeContract(outputExchangeAddress)
  const contract = swapType === ETH_TO_TOKEN ? outputExchangeContract : inputExchangeContract

  // get input allowance
  const inputAllowance = useAddressAllowance(account, inputCurrency, inputExchangeAddress)

  // fetch reserves for each of the currency types
  const { reserveETH: inputReserveETH, reserveToken: inputReserveToken } = useExchangeReserves(inputCurrency)
  const { reserveETH: outputReserveETH, reserveToken: outputReserveToken } = useExchangeReserves(outputCurrency)

  // get balances for each of the currency types
  const inputBalance = useAddressBalance(account, inputCurrency)
  const outputBalance = useAddressBalance(account, outputCurrency)
  const inputBalanceFormatted = !!(inputBalance && Number.isInteger(inputDecimals))
    ? amountFormatter(inputBalance, inputDecimals, Math.min(6, inputDecimals))
    : ''
  const outputBalanceFormatted = !!(outputBalance && Number.isInteger(outputDecimals))
    ? amountFormatter(outputBalance, outputDecimals, Math.min(6, outputDecimals))
    : ''

  // compute useful transforms of the data above
  const independentDecimals = independentField === INPUT ? inputDecimals : outputDecimals
  const dependentDecimals = independentField === OUTPUT ? inputDecimals : outputDecimals

  // declare/get parsed and formatted versions of input/output values
  const [independentValueParsed, setIndependentValueParsed] = useState()
  const dependentValueFormatted = !!(dependentValue && (dependentDecimals || dependentDecimals === 0))
    ? amountFormatter(dependentValue, dependentDecimals, dependentDecimals, false)
    // ? amountFormatter(dependentValue, dependentDecimals, Math.min(6, dependentDecimals), false)
    : ''
  const inputValueParsed = independentField === INPUT ? independentValueParsed : dependentValue
  const outputValueParsed = independentField === OUTPUT ? independentValueParsed : dependentValue
  let inputValueFormatted = independentField === INPUT ? independentValue : dependentValueFormatted
  let outputValueFormatted = independentField === OUTPUT ? independentValue : dependentValueFormatted
  if (independentField) {
    inputValueFormatted *= 1 + 0.001
    inputValueFormatted = Number(inputValueFormatted.toFixed(dependentDecimals)) ? Number(inputValueFormatted.toFixed(Math.min(8, dependentDecimals))) : ''
  } else {
    outputValueFormatted *= 1 - 0.001
    outputValueFormatted = Number(outputValueFormatted.toFixed(dependentDecimals)) ? Number(outputValueFormatted.toFixed(Math.min(8, dependentDecimals))) : ''
   }
  const [independentError, setIndependentError] = useState()
  useEffect(() => {
    if (independentValue && (independentDecimals || independentDecimals === 0)) {
      try {
        const parsedValue = ethers.utils.parseUnits(independentValue, independentDecimals)

        if (parsedValue.lte(ethers.constants.Zero) || parsedValue.gte(ethers.constants.MaxUint256)) {
          throw Error()
        } else {
          setIndependentValueParsed(parsedValue)
          setIndependentError(null)
        }
      } catch {
        setIndependentError(t('inputNotValid'))
      }

      return () => {
        setIndependentValueParsed()
        setIndependentError()
      }
    }
  }, [independentValue, independentDecimals, t])

  // calculate slippage from target rate
  const { minimum: dependentValueMinumum, maximum: dependentValueMaximum } = calculateSlippageBounds(
    dependentValue,
    swapType === TOKEN_TO_TOKEN,
    tokenAllowedSlippageBig,
    allowedSlippageBig
  )

  // validate input allowance + balance
  const [inputError, setInputError] = useState()
  const [showUnlock, setShowUnlock] = useState(false)
  useEffect(() => {
    const inputValueCalculation = independentField === INPUT ? independentValueParsed : dependentValueMaximum
    if (inputBalance && (inputAllowance || inputCurrency === config.symbol) && inputValueCalculation) {
      if (inputBalance.lt(inputValueCalculation)) {
        setInputError(t('insufficientBalance'))
      } else if (inputCurrency !== config.symbol && inputAllowance.lt(inputValueCalculation)) {
        setInputError(t('unlockTokenCont'))
        setShowUnlock(true)
      } else {
        setInputError(null)
        setShowUnlock(false)
      }
      return () => {
        setInputError()
        setShowUnlock(false)
      }
    }
  }, [independentField, independentValueParsed, dependentValueMaximum, inputBalance, inputCurrency, inputAllowance, t])

  // calculate dependent value
  useEffect(() => {
    const amount = independentValueParsed

    if (swapType === ETH_TO_TOKEN) {
      const reserveETH = outputReserveETH
      const reserveToken = outputReserveToken

      if (amount && reserveETH && reserveToken) {
        try {
          const calculatedDependentValue =
            independentField === INPUT
              ? calculateEtherTokenOutputFromInput(amount, reserveETH, reserveToken)
              : calculateEtherTokenInputFromOutput(amount, reserveETH, reserveToken)

          if (calculatedDependentValue.lte(ethers.constants.Zero)) {
            throw Error()
          }

          dispatchSwapState({
            type: 'UPDATE_DEPENDENT',
            payload: calculatedDependentValue
          })
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    } else if (swapType === TOKEN_TO_ETH) {
      const reserveETH = inputReserveETH
      const reserveToken = inputReserveToken

      if (amount && reserveETH && reserveToken) {
        try {
          const calculatedDependentValue =
            independentField === INPUT
              ? calculateEtherTokenOutputFromInput(amount, reserveToken, reserveETH)
              : calculateEtherTokenInputFromOutput(amount, reserveToken, reserveETH)

          if (calculatedDependentValue.lte(ethers.constants.Zero)) {
            throw Error()
          }

          dispatchSwapState({
            type: 'UPDATE_DEPENDENT',
            payload: calculatedDependentValue
          })
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    } else if (swapType === TOKEN_TO_TOKEN) {
      const reserveETHFirst = inputReserveETH
      const reserveTokenFirst = inputReserveToken

      const reserveETHSecond = outputReserveETH
      const reserveTokenSecond = outputReserveToken

      if (amount && reserveETHFirst && reserveTokenFirst && reserveETHSecond && reserveTokenSecond) {
        try {
          if (independentField === INPUT) {
            const intermediateValue = calculateEtherTokenOutputFromInput(amount, reserveTokenFirst, reserveETHFirst)
            if (intermediateValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            const calculatedDependentValue = calculateEtherTokenOutputFromInput(
              intermediateValue,
              reserveETHSecond,
              reserveTokenSecond
            )
            if (calculatedDependentValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            dispatchSwapState({
              type: 'UPDATE_DEPENDENT',
              payload: calculatedDependentValue
            })
          } else {
            const intermediateValue = calculateEtherTokenInputFromOutput(amount, reserveETHSecond, reserveTokenSecond)
            if (intermediateValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            const calculatedDependentValue = calculateEtherTokenInputFromOutput(
              intermediateValue,
              reserveTokenFirst,
              reserveETHFirst
            )
            if (calculatedDependentValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            dispatchSwapState({
              type: 'UPDATE_DEPENDENT',
              payload: calculatedDependentValue
            })
          }
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    }
  }, [
    independentValueParsed,
    swapType,
    outputReserveETH,
    outputReserveToken,
    inputReserveETH,
    inputReserveToken,
    independentField,
    t
  ])

  const [inverted, setInverted] = useState(false)
  const exchangeRate = getExchangeRate()
 
  const marketRate = getMarketRate(
    swapType,
    inputReserveETH,
    inputReserveToken,
    inputDecimals,
    outputReserveETH,
    outputReserveToken,
    outputDecimals
  )

  const percentSlippage =
    exchangeRate && marketRate && !marketRate.isZero()
      ? exchangeRate
          .sub(marketRate)
          .abs()
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
          .div(marketRate)
          .sub(ethers.utils.bigNumberify(3).mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(15))))
      : undefined
  const percentSlippageFormatted = percentSlippage && amountFormatter(percentSlippage, 16, 2)
  const slippageWarning =
    percentSlippage &&
    percentSlippage.gte(ethers.utils.parseEther('.05')) &&
    percentSlippage.lt(ethers.utils.parseEther('.2')) // [5% - 20%)
  const highSlippageWarning = percentSlippage && percentSlippage.gte(ethers.utils.parseEther('.2')) // [20+%

  const isValid =  exchangeRate && inputError === null && independentError === null && deadlineFromNow
  
  const estimatedText = `(${t('estimated')})`
  function formatBalance(value) {
    return `Balance: ${value}`
  }

  const [isDisabled, setIsDisableed] = useState(true)

  async function onSwap() {
    if (!isDisabled) return
    setIsDisableed(false)
    setTimeout(() => {
      setIsDisableed(true)
    }, 3000)
    const deadline = Math.ceil(Date.now() / 1000) + deadlineFromNow

    let estimate, method, args, value
    let txnsType = sending ? 'SEND' : 'SWAP'

    if (config.supportWallet.includes(walletType)) {
      setIsHardwareError(false)
      setIsHardwareTip(true)
      setHardwareTxnsInfo(inputValueFormatted + inputSymbol)
      let contractAddress = swapType === ETH_TO_TOKEN ? outputExchangeAddress : inputExchangeAddress
      let web3Contract = getWeb3ConTract(PRESALE_ABI, contractAddress)
      let data =  web3Contract.methods.presale(independentValueParsed.toHexString()).encodeABI();
    
      value = swapType === ETH_TO_TOKEN ? value.toHexString() : 0
      
      getWeb3BaseInfo(contractAddress, data, account, value).then(res => {
        if (res.msg === 'Success') {
          addTransaction(res.info)
          recordTxns(res.info, txnsType, inputSymbol + '/' + outputSymbol, account, recipient.address)
          setIsHardwareTip(false)
          dispatchSwapState({
            type: 'UPDATE_INDEPENDENT',
            payload: { value: '', field: INPUT }
          })
          dispatchSwapState({
            type: 'UPDATE_INDEPENDENT',
            payload: { value: '', field: OUTPUT }
          })
          setIsViewTxnsDtil(false)
        } else {
          setIsHardwareError(true)
        }
      })
      return
    }
    const estimatedGasLimit = await estimate(...args, { value })
    method(...args, {
      value,
      gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN)
    }).then(response => {
      // console.log(response)
      addTransaction(response)
      recordTxns(response, txnsType, inputSymbol + '/' + outputSymbol, account, recipient.address)
      dispatchSwapState({
        type: 'UPDATE_INDEPENDENT',
        payload: { value: '', field: INPUT }
      })
      dispatchSwapState({
        type: 'UPDATE_INDEPENDENT',
        payload: { value: '', field: OUTPUT }
      })
      setIsViewTxnsDtil(false)
    }).catch(err => {
      console.log(err)
    })
  }

  const [customSlippageError, setcustomSlippageError] = useState('')

  const toggleWalletModal = useWalletModalToggle()

  const newInputDetected =
    inputCurrency !== config.symbol && inputCurrency && !INITIAL_TOKENS_CONTEXT[chainId].hasOwnProperty(inputCurrency)

  const newOutputDetected =
    outputCurrency !== config.symbol && outputCurrency && !INITIAL_TOKENS_CONTEXT[chainId].hasOwnProperty(outputCurrency)

  const [showInputWarning, setShowInputWarning] = useState(false)
  const [showOutputWarning, setShowOutputWarning] = useState(false)
  
  const [isHardwareTip, setIsHardwareTip] = useState(false)
  const [isHardwareError, setIsHardwareError] = useState(false)
  const [hardwareTxnsInfo, setHardwareTxnsInfo] = useState('')

  useEffect(() => {
    if (newInputDetected) {
      setShowInputWarning(true)
    } else {
      setShowInputWarning(false)
    }
  }, [newInputDetected, setShowInputWarning])

  useEffect(() => {
    if (newOutputDetected) {
      setShowOutputWarning(true)
    } else {
      setShowOutputWarning(false)
    }
  }, [newOutputDetected, setShowOutputWarning])

  const [isViewTxnsDtil, setIsViewTxnsDtil] = useState(false)

  return (
    <>
      <HardwareTip
        HardwareTipOpen={isHardwareTip}
        closeHardwareTip={() => {
          setIsHardwareTip(false)
        }}
        error={isHardwareError}
        txnsInfo={hardwareTxnsInfo}
        coinType={inputSymbol}
      ></HardwareTip>
      {showInputWarning && (
        <WarningCard
          onDismiss={() => {
            setShowInputWarning(false)
          }}
          urlAddedTokens={urlAddedTokens}
          currency={inputCurrency}
        />
      )}
      {showOutputWarning && (
        <WarningCard
          onDismiss={() => {
            setShowOutputWarning(false)
          }}
          urlAddedTokens={urlAddedTokens}
          currency={outputCurrency}
        />
      )}
      <Title
        title={t('Presale')}
        tabList={[
          {
            name: t('swap'),
            onTabClick: name => {
              setSending(false)
            },
            iconUrl: require('../../assets/images/icon/swap.svg'),
            iconActiveUrl: require('../../assets/images/icon/swap-white.svg')
          }
        ]}
      ></Title>
      <CurrencyInputPanel
        title={t('input')}
        urlAddedTokens={urlAddedTokens}
        description={inputValueFormatted && independentField === OUTPUT ? estimatedText : ''}
        extraText={inputBalanceFormatted && formatBalance(inputBalanceFormatted)}
        extraTextClickHander={() => {
          if (inputBalance && inputDecimals) {
            const valueToSet = inputCurrency === config.symbol ? inputBalance.sub(ethers.utils.parseEther('.1')) : inputBalance
            if (valueToSet.gt(ethers.constants.Zero)) {
              dispatchSwapState({
                type: 'UPDATE_INDEPENDENT',
                payload: {
                  value: amountFormatter(valueToSet, inputDecimals, inputDecimals, false),
                  field: INPUT
                }
              })
            }
          }
        }}
        onCurrencySelected={inputCurrency => {
          dispatchSwapState({
            type: 'SELECT_CURRENCY',
            payload: { currency: inputCurrency, field: INPUT }
          })
        }}
        onValueChange={inputValue => {
          dispatchSwapState({
            type: 'UPDATE_INDEPENDENT',
            payload: { value: inputValue, field: INPUT }
          })
        }}
        showUnlock={showUnlock}
        disableTokenSelect = {true}
        selectedTokens={[inputCurrency, outputCurrency]}
        selectedTokenAddress={inputCurrency}
        value={inputValueFormatted}
        errorMessage={inputError ? inputError : independentField === INPUT ? independentError : ''}
      />
      <CurrencyInputPanel
        title={t('output')}
        disableTokenSelect = {true}
        description={outputValueFormatted && independentField === INPUT ? estimatedText : ''}
        extraText={outputBalanceFormatted && formatBalance(outputBalanceFormatted)}
        urlAddedTokens={urlAddedTokens}
        onCurrencySelected={outputCurrency => {
          dispatchSwapState({
            type: 'SELECT_CURRENCY',
            payload: { currency: outputCurrency, field: OUTPUT }
          })
        }}
        onValueChange={outputValue => {
          dispatchSwapState({
            type: 'UPDATE_INDEPENDENT',
            payload: { value: outputValue, field: OUTPUT }
          })
        }}
        selectedTokens={[inputCurrency, outputCurrency]}
        selectedTokenAddress={outputCurrency}
        value={outputValueFormatted}
        errorMessage={independentField === OUTPUT ? independentError : ''}
        disableUnlock
      />
      <ExchangeRateWrapperBox>
        <ExchangeRateWrapper
          onClick={() => {
            setInverted(inverted => !inverted)
          }}
        >
          <ExchangeRate>{t('exchangeRate')}：</ExchangeRate>
          <span>
              {exchangeRate
                ? `1 ${inputSymbol} = ${amountFormatter(exchangeRate, 18, 6, false)} ${outputSymbol}`
                : ' - '}
            </span>
        </ExchangeRateWrapper>
      </ExchangeRateWrapperBox>
      {isViewTxnsDtil ? (
        <TransactionDetails
          account={account}
          setRawSlippage={setRawSlippage}
          setRawTokenSlippage={setRawTokenSlippage}
          rawSlippage={rawSlippage}
          slippageWarning={slippageWarning}
          highSlippageWarning={highSlippageWarning}
          brokenTokenWarning={brokenTokenWarning}
          setDeadline={setDeadlineFromNow}
          deadline={deadlineFromNow}
          inputError={inputError}
          independentError={independentError}
          inputCurrency={inputCurrency}
          outputCurrency={outputCurrency}
          independentValue={independentValue}
          independentValueParsed={independentValueParsed}
          independentField={independentField}
          INPUT={INPUT}
          inputValueParsed={inputValueParsed}
          outputValueParsed={outputValueParsed}
          inputSymbol={inputSymbol}
          outputSymbol={outputSymbol}
          dependentValueMinumum={dependentValueMinumum}
          dependentValueMaximum={dependentValueMaximum}
          dependentDecimals={dependentDecimals}
          independentDecimals={independentDecimals}
          percentSlippageFormatted={percentSlippageFormatted}
          setcustomSlippageError={setcustomSlippageError}
          recipientAddress={recipient.address}
          sending={sending}
        />
      ) : (
        ''
      )}
      <WarningTip></WarningTip>
      {config.dirSwitchFn(inputIsSwitch) && config.dirSwitchFn(outputIsSwitch) ? (
        <Flex>
          <Button
            disabled={
              brokenTokenWarning || !isDisabled || showBetaMessage ? true : !account && !error ? false : !isValid || customSlippageError === 'invalid'
            }
            onClick={account && !error ? onSwap : toggleWalletModal}
            warning={highSlippageWarning || customSlippageError === 'warning'}
            loggedOut={!account}
          >
            {
              sending ? (
                <img alt={''} src={SendWhiteIcon} style={{marginRight: '15px'}} />
              ) : (
                <img alt={''} src={SwapWhiteIcon} style={{marginRight: '15px'}} />
              )
            }
            {brokenTokenWarning
              ? 'Buy'
              : !account
              ? t('connectToWallet')
              : sending
              ? highSlippageWarning || customSlippageError === 'warning'
                ? t('sendAnyway')
                : t('send')
              : highSlippageWarning || customSlippageError === 'warning'
              ? t('swapAnyway')
              : t('Buy')}
          </Button>
        </Flex>
      ) : (
        <Flex>
          <Button disabled={true}>
            {t('ComineSoon')}
          </Button>
        </Flex>
      )}
    </>
  )
}
