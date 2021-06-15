import {expect} from "chai";
import {Deployer} from "./utils/deployer";
import {ethers} from "ethers";

const hre = require("hardhat");

describe("Nabe", function () {

    let contracts: Deployer;
    let owner: any;
    before(async function () {
        contracts = await Deployer.getInstance();
        [owner] = await hre.ethers.getSigners();
    });

    describe('Deploy BentoBox, KashiMaster & Nabe & Oracle', function () {
        it('Should deploy BentoBox', async function () {
            expect(await contracts.bentoBox.owner()).to.equal(owner.address);
        });
        it('Should deploy KashiMaster', async function () {
            expect(await contracts.kashiMaster.bentoBox()).to.equal(contracts.bentoBox.address);
        });
        it('Should deploy Nabe', async function () {
            expect(await contracts.nabe.bentoBox()).to.equal(contracts.bentoBox.address);
        });
        it('should deploy OracleMock', async function () {
            expect(await contracts.oracle.symbol(await contracts.oracle.getDataParameter())).to.equal('TEST');
        });
    });

    describe('Deploy ERC20', function () {
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

    describe('Deploy kashi pairs', function () {
        it('Should deploy kashi pairs for each assets and collaterals', async function () {
            //todo make this test cleaner
            await Promise.all(contracts.assets.map(async (asset) => {
                await Promise.all(contracts.collaterals.map(async (collateral) => {
                    await contracts.deployKashiPair(asset, collateral, contracts.oracle);
                }));
            }));

            const kashiAddresses: ethers.Event[] = await contracts.bentoBox.queryFilter(await contracts.bentoBox.filters.LogDeploy(contracts.kashiMaster.address));
            //todo fix logs order
            await Promise.all(kashiAddresses.map(async (log: any) => {
                const newPair = await hre.ethers.getContractFactory('KashiPair');
                contracts.kashiPairs.push(newPair.attach(log.args.cloneAddress));
            }));

            expect(await contracts.kashiPairs[0].asset()).to.equal(contracts.assets[0].address);
        });
    });

    describe('Deposit assets into bentoBox', function () {
        it('Should approve assets', async function () {
            await Promise.all(contracts.assets.map(async (asset) => {
                const totalSupply: number = await asset.totalSupply();
                await asset.approve(contracts.bentoBox.address, totalSupply);
                expect(await asset.allowance(owner.address, contracts.bentoBox.address)).to.equal(totalSupply);
            }));
        });

        it('Should deposit all assets in the bentoBox', async function () {
            await Promise.all(contracts.assets.map(async (asset) => {
                const totalSupply = await asset.totalSupply();
                await asset.approve(contracts.bentoBox.address, totalSupply);
                await contracts.bentoBox.deposit(asset.address, owner.address, owner.address, totalSupply, 0);
                expect(await contracts.bentoBox.toAmount(asset.address, await contracts.bentoBox.balanceOf(asset.address, owner.address), true)).to.equal(totalSupply);
            }));
        });
    });

    describe('Deposit assets into Nabe', function () {
        it('Should revert a deposit when Nabe not approved', async function () {
            const collateralsMaxShares = contracts.collaterals.map(() => {
                return 1000; //equal to the deposit share
            });
            const sharesToDeposit = await contracts.bentoBox.toShare(contracts.assets[0].address, 1000, true);
            // @ts-ignore
            await expect(contracts.nabe.deposit(contracts.assets[0].address, sharesToDeposit, Deployer.getContractAddresses(contracts.collaterals), collateralsMaxShares)).to.be.revertedWith('BentoBox: Transfer not approved');
        });

        it('Should approve Nabe', async function () {
            await contracts.bentoBox.whitelistMasterContract(contracts.nabe.address, true); //whitelist nabe but not needed if able to produce eip-712 signature in setMasterContractApproval
            await contracts.bentoBox.setMasterContractApproval(owner.address, contracts.nabe.address, true, 0, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(await contracts.bentoBox.masterContractApproved(contracts.nabe.address, owner.address)).to.equal(true);
        });

        it('Should revert a deposit assets when setting an invalid max for all collaterals', async function () {
            const depositShare: number = 1000;
            const sharesToDeposit = await contracts.bentoBox.toShare(contracts.assets[0].address, depositShare, true);
            const collateralsMaxShares = contracts.collaterals.map(() => {
                return 1_000_000; //more than the deposited shares /!\
            });
            await Promise.all(contracts.assets.map(async (asset) => {
                // @ts-ignore
                await expect(contracts.nabe.deposit(asset.address, sharesToDeposit, Deployer.getContractAddresses(contracts.collaterals), collateralsMaxShares)).to.be.revertedWith('Nabe: Max share can not exceed your balance');
            }));
        });

        it('Should deposit assets and set a valid max for all kashiPairs', async function () {
            const depositShare: number = 1000;
            const sharesToDeposit = await contracts.bentoBox.toShare(contracts.assets[0].address, 1000, true);
            const collateralsMaxShares = contracts.collaterals.map(() => {
                return depositShare; //equal to the deposit share
            });

            await contracts.nabe.deposit(contracts.assets[0].address, sharesToDeposit, Deployer.getContractAddresses([contracts.kashiPairs[0], contracts.kashiPairs[1]]), collateralsMaxShares);
            await contracts.nabe.deposit(contracts.assets[1].address, sharesToDeposit, Deployer.getContractAddresses([contracts.kashiPairs[2], contracts.kashiPairs[3]]), collateralsMaxShares);
            expect(await contracts.nabe.tokens(contracts.assets[0].address, Deployer.getContractAddresses([contracts.kashiPairs[0]])[0])).to.equal(depositShare);
            expect(await contracts.nabe.tokens(contracts.assets[1].address, Deployer.getContractAddresses([contracts.kashiPairs[2]])[0])).to.equal(depositShare);
        });
    });

    describe('Remove assets from Nabe', function () {
        it('Should revert remove assets from Nabe when _share superior to userToken balance', async function () {
            // @ts-ignore
            await Promise.all(contracts.assets.map(async (asset) => {
                const assetInNabe = await contracts.nabe.userTokens(asset.address, owner.address);
                // @ts-ignore
                await expect(contracts.nabe.remove(asset.address, assetInNabe + 1)).to.be.revertedWith('Nabe: _share can not be superior to the userToken share');
            }));
        });
        it('Should remove all assets from Nabe', async function () {
            await Promise.all(contracts.assets.map(async (asset) => {
                const assetInNabe = await contracts.nabe.userTokens(asset.address, owner.address);

                expect(await contracts.nabe.userTokens(asset.address, owner.address)).to.equal(assetInNabe);
                await contracts.nabe.remove(asset.address, assetInNabe);
                expect(await contracts.nabe.userTokens(asset.address, owner.address)).to.equal(0);
            }));
        });
    });
});
