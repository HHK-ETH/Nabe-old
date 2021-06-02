import {expect} from "chai";

const hre = require("hardhat");

describe("Nabe", function () {

    let assets: any[] = [];
    let collaterals: any[] = [];
    let nabe: any;

    describe('Should deploy 2 assets & 2 collaterals as ERC20 & Nabe', async function () {
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
        it ('Should approve assets', async function () {
            const [owner] = await hre.ethers.getSigners();
            await Promise.all(assets.map(async (asset) => {
                const totalSupply: number = await asset.totalSupply();
                await asset.approve(nabe.address, totalSupply);
                expect(await asset.allowance(owner.address, nabe.address)).to.equal(totalSupply);
            }));
        })
    });
});
