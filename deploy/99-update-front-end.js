const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_CONTRACT_FILE =
    "../nextjs-nft-marketplace-thegraph/constants/networkMapping.json"
const FRONT_END_ABI_LOCATION = "../nextjs-nft-marketplace-thegraph/constants/"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        await updateContractAddresses()
        await updateAbi()
    }
}

async function updateAbi() {
    const nftMarketplaceContract = await ethers.getContract("NftMarketplace")
    fs.writeFileSync(
        `${FRONT_END_ABI_LOCATION}NftMarketplace.json`,
        nftMarketplaceContract.interface.format(ethers.utils.FormatTypes.json)
    )

    const basicNft = await ethers.getContract("BasicNft")
    fs.writeFileSync(
        `${FRONT_END_ABI_LOCATION}BasicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const nftMarketplaceContract = await ethers.getContract("NftMarketplace")
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_CONTRACT_FILE, "utf8")
    )
    if (chainId in currentAddresses) {
        if (
            !currentAddresses[chainId]["NftMarketplace"].includes(
                nftMarketplaceContract.address
            )
        ) {
            currentAddresses[chainId]["NftMarketplace"].push(
                nftMarketplaceContract.address
            )
        }
    }
    {
        currentAddresses[chainId] = {
            NftMarketplace: [nftMarketplaceContract.address],
        }
    }
    fs.writeFileSync(FRONT_END_CONTRACT_FILE, JSON.stringify(currentAddresses))
}

module.exports.tags = ["all", "frontend"]
