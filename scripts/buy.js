const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const PRICE = ethers.utils.parseEther("0.1")
const TOKEN_ID = 0

async function buy() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
    const price = listing.price.toString()

    console.log("Buying NFT...")
    const buyingTx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: price})
    await buyingTx.wait(1)
    console.log("Item bought!")

    if (network.config.chainId == 31337) {
        await moveBlocks(1, (sleepAmount = 1000)) //1 seconde
    }
}

buy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
