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
});
