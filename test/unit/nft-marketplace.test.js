const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")

const TOKEN_ID = 0
let PRICE = ethers.utils.parseEther("0.1") //0.1 ETH

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Unit Tests", function () {
          let nftMarketplace,
              nftMarketplaceContract,
              basicNft,
              deployer,
              user,
              accounts
          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture("all")
              nftMarketplaceContract = await ethers.getContract(
                  "NftMarketplace"
              )
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              basicNft = await ethers.getContract("BasicNft", deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("reverts if the item is already listed", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed")
              })
              it("only allows the owner to list the item", async () => {
                  nftMarketplace = nftMarketplaceContract.connect(user)

                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("reverts if the item doesnt belong to the owner", async () => {
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("reverts when the price is 0", async function () {
                  const WRONG_PRICE = 0
                  await expect(
                      nftMarketplace.listItem(
                          basicNft.address,
                          TOKEN_ID,
                          WRONG_PRICE
                      )
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
              })
              it("reverts if the NFT is not approved", async () => {
                  await basicNft.mintNft()
                  await expect(
                      nftMarketplace.listItem(basicNft.address, 1, PRICE)
                  ).to.be.revertedWith(
                      "NftMarketplace__NotApprovedForMarketplace"
                  )
              })
              it("emits an event when the item is listed", async () => {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.emit(nftMarketplace, "ItemListed")
              })
          })

          describe("buyItem", function () {
              it("dosen't allows reentrancy", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.be.revertedWith("ReentrancyGuard: reentrant call")
              })
              it("reverts if the item is not listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if the value is less than the price asked", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const WRONG_PRICE = 0
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: WRONG_PRICE,
                      })
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })
              it("updates internal proceeds record when bought", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(nftMarketplace, "ItemBought")
                  assert(
                      await nftMarketplace.getProceeds(deployer.address),
                      PRICE
                  )
              })
              it("updates the listing", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing.price == 0)
              })
              it("transfers the nft to the buyer and ", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  assert(await basicNft.ownerOf(TOKEN_ID), user)
                  assert(await basicNft.balanceOf(user.address), 1) //Optional
              })
              it("emits an event when the NFT is bought", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(nftMarketplace, "ItemBought")
              })
          })
          describe("cancelListing", function () {
              beforeEach(async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
              })
              it("deletes the listing", async () => {
                  await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing.price, 0)
              })
              it("emits an event when the NFT listing is canceled", async () => {
                  expect(
                      await nftMarketplace.cancelListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                  ).to.emit(nftMarketplace, "ItemCanceled")
              })
          })
          describe("updateListing", function () {
              beforeEach(async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
              })
              it("updates the price of the listing", async () => {
                  const NEW_PRICE = ethers.utils.parseEther("0.5")
                  await nftMarketplace.updateListing(
                      basicNft.address,
                      TOKEN_ID,
                      NEW_PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(listing.price.toString(), NEW_PRICE.toString())
              })
              it("emits an event when the price is updated", async () => {
                  const NEW_PRICE = ethers.utils.parseEther("0.5")
                  expect(
                      await nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          NEW_PRICE
                      )
                  ).to.emit("ItemListed")
              })
          })
          describe("withdrawProceeds", function () {
              it("reverts if there's no proceed to withdraw", async () => {
                  await expect(
                      nftMarketplace.withdrawProceeds()
                  ).to.be.revertedWith("NftMarketplace__NoProceeds")
              })
              it("updates the proceeds of the seller", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)
                  await nftMarketplace.withdrawProceeds()
                  const proceeds = await nftMarketplace.getProceeds(
                      deployer.address
                  )
                  assert(proceeds, 0)
              })
              it("sends the proceeds to the seller", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)
                  const startingBalance = await deployer.getBalance()

                  const transactionResponse =
                      await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingBalance = await deployer.getBalance()

                  assert.equal(
                      (endingBalance.add(gasCost)).toString(),
                      (startingBalance.add(PRICE)).toString()
                  )
              })
          })
      })
