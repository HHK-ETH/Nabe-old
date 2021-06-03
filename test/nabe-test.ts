import {expect} from "chai";
import {Deployer} from "./utils/deployer";

const hre = require("hardhat");

describe("Nabe", function () {

    let contracts: Deployer;
    let owner: any;
    before(async function () {
        contracts = await Deployer.getInstance();
        [owner] = await hre.ethers.getSigners();
    });

    describe('Should deploy BentoBox, KashiMaster & Nabe', function () {
        it('Should deploy BentoBox', async function () {
            expect(await contracts.bentoBox.owner()).to.equal(owner.address);
        });
        it('Should deploy KashiMaster', async function () {
            expect(await contracts.kashiMaster.bentoBox()).to.equal(contracts.bentoBox.address);
        });
        it('Should deploy Nabe', async function () {
            expect(await contracts.nabe.name()).to.equal('Nabe');
        });
    });

    describe('Should deploy few ERC20', function () {
        it('Should deploy 2 assets as ERC20', async function () {
            contracts.assets.push(await Deployer.deployERC20Mock(1_000_000_000));
            contracts.assets.push(await Deployer.deployERC20Mock(1_000_000_000_000));

            expect(await contracts.assets[0].totalSupply()).to.equal(1_000_000_000);
            expect(await contracts.assets[1].totalSupply()).to.equal(1_000_000_000_000);
        });

        it('Should deploy 2 collaterals as ERC20', async function () {
            contracts.collaterals.push(await Deployer.deployERC20Mock(1_000_000_000));
            contracts.collaterals.push(await Deployer.deployERC20Mock(1_000_000_000_000));

            expect(await contracts.collaterals[0].totalSupply()).to.equal(1_000_000_000);
            expect(await contracts.collaterals[1].totalSupply()).to.equal(1_000_000_000_000);
        });
    });

    describe('Should deposit into Nabe', function () {
        it('Should revert a deposit when not approved or superior to wallet balance', async function () {
            const collateralsMaxAmounts = contracts.collaterals.map(() => {
                return 100; //equal to the deposit amount
            });
            // @ts-ignore
            await expect(contracts.nabe.deposit(contracts.assets[0].address, 100, contracts.getCollateralsAddresses(), collateralsMaxAmounts)).to.be.revertedWith('BoringERC20: TransferFrom failed');
            // @ts-ignore
            await expect(contracts.nabe.deposit(contracts.assets[0].address, 1_000_000_000_000, contracts.getCollateralsAddresses(), collateralsMaxAmounts)).to.be.revertedWith('BoringERC20: TransferFrom failed');
        });

        it('Should approve assets', async function () {
            await Promise.all(contracts.assets.map(async (asset) => {
                const totalSupply: number = await asset.totalSupply();
                await asset.approve(contracts.nabe.address, totalSupply);
                expect(await asset.allowance(owner.address, contracts.nabe.address)).to.equal(totalSupply);
            }));
        });

        it('Should deposit assets and set a valid max for all collaterals', async function () {
            const depositAmount: number = 100;
            const collateralsMaxAmounts = contracts.collaterals.map(() => {
                return 100; //equal to the deposit amount
            });
            await Promise.all(contracts.assets.map(async (asset) => {
                await contracts.nabe.deposit(asset.address, depositAmount, contracts.getCollateralsAddresses(), collateralsMaxAmounts);
                expect(await contracts.nabe.tokens(asset.address, contracts.getCollateralsAddresses()[0])).to.equal(depositAmount);
            }));
        });

        it('Should revert a deposit assets when setting an invalid max for all collaterals', async function () {
            const depositAmount: number = 100;
            const collateralsMaxAmounts = contracts.collaterals.map(() => {
                return 1_000_000; //more than the deposits amount /!\
            });
            await Promise.all(contracts.assets.map(async (asset) => {
                // @ts-ignore
                await expect(contracts.nabe.deposit(asset.address, depositAmount, contracts.getCollateralsAddresses(), collateralsMaxAmounts)).to.be.revertedWith('Max amount can not exceed your balance');
            }));
        });
    });

    describe('Should remove from Nabe', function () {
        it('Should revert remove assets from Nabe when _amount superior to userToken balance', async function () {
            // @ts-ignore
            await Promise.all(contracts.assets.map(async (asset) => {
                const assetInNabe = await contracts.nabe.userTokens(asset.address, owner.address);
                // @ts-ignore
                await expect(contracts.nabe.remove(asset.address, assetInNabe + 1)).to.be.revertedWith('_amount can not be superior to the userToken amount');
            }));
        });
        it('Should remove assets from Nabe', async function () {
            await Promise.all(contracts.assets.map(async (asset) => {
                const assetInNabe = await contracts.nabe.userTokens(asset.address, owner.address);

                expect(await contracts.nabe.userTokens(asset.address, owner.address)).to.equal(assetInNabe);
                await contracts.nabe.remove(asset.address, assetInNabe);
                expect(await contracts.nabe.userTokens(asset.address, owner.address)).to.equal(0);
            }));
        });
    });
});
