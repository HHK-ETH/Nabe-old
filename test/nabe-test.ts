import {expect} from "chai";

const hre = require("hardhat");

describe("Nabe", function () {

    let assets: any[] = [];
    let collaterals: any[] = [];
    let nabe: any;

    describe('Should deploy 2 assets ERC20 & 2 collaterals ERC20 & Nabe contract', async function () {
        it('Should deploy 2 assets', async function () {
            const ERC20Mock = await hre.ethers.getContractFactory('ERC20Mock');
            const assetA = await ERC20Mock.deploy(1_000_000_000);
            const assetB = await ERC20Mock.deploy(1_000_000_000_000);
            await assetA.deployed();
            await assetB.deployed();
            assets.push(assetA, assetB);

            expect(await assets[0].totalSupply()).to.equal(1_000_000_000);
            expect(await assets[1].totalSupply()).to.equal(1_000_000_000_000);
        });

        it('Should deploy 2 collaterals', async function () {
            const ERC20Mock = await hre.ethers.getContractFactory('ERC20Mock');
            const colA = await ERC20Mock.deploy(1_000_000_000);
            const colB = await ERC20Mock.deploy(1_000_000_000_000);
            await colA.deployed();
            await colB.deployed();
            collaterals.push(colA, colB);

            expect(await collaterals[0].totalSupply()).to.equal(1_000_000_000);
            expect(await collaterals[1].totalSupply()).to.equal(1_000_000_000_000);
        });

        it('Should deploy Nabe', async function () {
            const Nabe = await hre.ethers.getContractFactory('Nabe');
            nabe = await Nabe.deploy('Nabe');
            await nabe.deployed();

            expect(await nabe.name()).to.equal('Nabe');
        });
    });

    describe('Should deposit into Nabe', async function () {
        it('Should revert a deposit when not approved or superior to wallet balance', async function () {
            const collateralsMaxAmounts = collaterals.map(() => {
                return 100; //equal to the deposit amount
            });
            const collateralsAddresses = collaterals.map((collateral) => {
                return collateral.address;
            });
            // @ts-ignore
            await expect(nabe.deposit(assets[0].address, 100, collateralsAddresses, collateralsMaxAmounts)).to.be.revertedWith('BoringERC20: TransferFrom failed');
            // @ts-ignore
            await expect(nabe.deposit(assets[0].address, 1_000_000_000_000, collateralsAddresses, collateralsMaxAmounts)).to.be.revertedWith('BoringERC20: TransferFrom failed');
        });

        it('Should approve assets', async function () {
            const [owner] = await hre.ethers.getSigners();
            await Promise.all(assets.map(async (asset) => {
                const totalSupply: number = await asset.totalSupply();
                await asset.approve(nabe.address, totalSupply);
                expect(await asset.allowance(owner.address, nabe.address)).to.equal(totalSupply);
            }));
        });

        it('Should deposit assets and set a valid max for all collaterals', async function () {
            const depositAmount: number = 100;
            const collateralsAddresses = collaterals.map((collateral) => {
                return collateral.address;
            });
            const collateralsMaxAmounts = collaterals.map(() => {
                return 100; //equal to the deposit amount
            });
            await Promise.all(assets.map(async (asset) => {
                await nabe.deposit(asset.address, depositAmount, collateralsAddresses, collateralsMaxAmounts);
                expect(await nabe.tokens(asset.address, collateralsAddresses[0])).to.equal(depositAmount);
            }));
        });

        it('Should revert a deposit assets when setting an invalid max for all collaterals', async function () {
            const depositAmount: number = 100;
            const collateralsAddresses = collaterals.map((collateral) => {
                return collateral.address;
            });
            const collateralsMaxAmounts = collaterals.map(() => {
                return 1_000_000; //more than the deposits amount /!\
            });
            await Promise.all(assets.map(async (asset) => {
                // @ts-ignore
                await expect(nabe.deposit(asset.address, depositAmount, collateralsAddresses, collateralsMaxAmounts)).to.be.revertedWith('Max amount can not exceed your balance');
            }));
        });
    });

    describe('Should remove from Nabe', async function() {
            it('Should revert remove assets from Nabe when _amount superior to userToken balance', async function () {
                // @ts-ignore
                await Promise.all(assets.map(async (asset) => {
                    const [owner] = await hre.ethers.getSigners();
                    const assetInNabe = await nabe.userTokens(asset.address, owner.address);
                    // @ts-ignore
                    await expect(nabe.remove(asset.address, assetInNabe+1)).to.be.revertedWith('_amount can not be superior to the userToken amount');
                }));
            });
            it('Should remove assets from Nabe', async function () {
                await Promise.all(assets.map(async (asset) => {
                    const [owner] = await hre.ethers.getSigners();
                    const assetInNabe = await nabe.userTokens(asset.address, owner.address);

                    expect(await nabe.userTokens(asset.address, owner.address)).to.equal(assetInNabe);
                    await nabe.remove(asset.address, assetInNabe);
                    expect(await nabe.userTokens(asset.address, owner.address)).to.equal(0);
                }));
            });
    });
});
