/* eslint-disable prefer-const */
import { BigDecimal, Address } from "@graphprotocol/graph-ts/index";
import { Pair, Token, Bundle } from "../generated/schema";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./utils";

let WMTR_ADDRESS = "0x160361ce13ec33c993b5cca8f62b6864943eb083";
let WMTR_USDT_PAIR = "0xb4a569afe59178547bb2c301ae4d5fa988666699"; // created block 589414
let WMTR_USDC_PAIR = "0x11f8c5dbcb7fc98ce9f2d09e2e8dd04b9c87bbb5"; // created block 648115

export function getBnbPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin

  let usdcPair = Pair.load(WMTR_USDC_PAIR); // usdc is token1
  let usdtPair = Pair.load(WMTR_USDT_PAIR); // usdt is token1
 
  if (usdcPair !== null && usdtPair !== null) {
    let totalLiquidityBNB = usdcPair.reserve0.plus(usdtPair.reserve0);
    if (totalLiquidityBNB.notEqual(ZERO_BD)) {
      let busdWeight = usdcPair.reserve0.div(totalLiquidityBNB);
      let usdtWeight = usdtPair.reserve0.div(totalLiquidityBNB);
      return usdcPair.token1Price.times(busdWeight).plus(usdtPair.token1Price.times(usdtWeight));
    } else {
      return ZERO_BD;
    }
  } else if (usdcPair !== null) {
    return usdcPair.token1Price;
  } else if (usdtPair !== null) {
    return usdtPair.token1Price;
  } else {
    return ZERO_BD;
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  "0xf0e86246519be0810c9fafc8430c49799985aaa8", // BNB
  "0x24aa189dfaa76c671c279262f94434770f557c35", // BUSD
  "0x5fa41671c48e3c951afc30816947126ccc8c162e", // USDT
  "0xd86e243fc0007e6226b07c9a50c9d70d78299eb5", // USDC
  
  // "0x23396cf899ca06c4472205fc903bdb4de249d6fc", // UST
  // "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB
  "0x160361ce13ec33c993b5cca8f62b6864943eb083",    //
  "0x983147fb73a45fc7f8b4dfa1cd61bdc7b111e5b6", // ETH
];

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_BNB = BigDecimal.fromString("0.001");

/**
 * Search through graph to find derived BNB per token.
 * @todo update to be derived BNB (add stablecoin estimates)
 **/
export function findBnbPerToken(token: Token): BigDecimal {
  if (token.id == WMTR_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHex() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHex());
      if (pair.token0 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
        let token1 = Token.load(pair.token1);
        return pair.token1Price.times(token1.derivedBNB as BigDecimal); // return token1 per our token * BNB per token 1
      }
      if (pair.token1 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
        let token0 = Token.load(pair.token0);
        return pair.token0Price.times(token0.derivedBNB as BigDecimal); // return token0 per our token * BNB per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedBNB.times(bundle.bnbPrice);
  let price1 = token1.derivedBNB.times(bundle.bnbPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString("2"));
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked fee amount based on token whitelist
 * If both are, return the difference between the token amounts
 * If not, return 0
 */
export function getTrackedFeeVolumeUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedBNB.times(bundle.bnbPrice);
  let price1 = token1.derivedBNB.times(bundle.bnbPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    let tokenAmount0USD = tokenAmount0.times(price0);
    let tokenAmount1USD = tokenAmount1.times(price1);
    if (tokenAmount0USD.ge(tokenAmount1USD)) {
      return tokenAmount0USD.minus(tokenAmount1USD);
    } else {
      return tokenAmount1USD.minus(tokenAmount0USD);
    }
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedBNB.times(bundle.bnbPrice);
  let price1 = token1.derivedBNB.times(bundle.bnbPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}
