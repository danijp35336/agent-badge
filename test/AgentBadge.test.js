const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const DAY = 24 * 60 * 60;

describe("AgentBadge", function () {
  async function deployFixture() {
    const [deployer, holder, holder2, stranger] = await ethers.getSigners();
    const MockAgentId = await ethers.getContractFactory("MockAgentId");
    const mock = await MockAgentId.deploy();
    const AgentBadge = await ethers.getContractFactory("AgentBadge");
    const badge = await AgentBadge.deploy(await mock.getAddress());
    await mock.setBalance(holder.address, 1);
    await mock.setHandle(holder.address, "danijp");
    await mock.setBalance(holder2.address, 3); // multiple Agent IDs: still one badge
    return { badge, mock, deployer, holder, holder2, stranger };
  }

  async function checkInOnNextDay(badge, signer, daysAhead) {
    await time.increase(daysAhead * DAY);
    await badge.connect(signer).checkIn();
  }

  it("claim reverts for a non-Agent-ID-holder", async function () {
    const { badge, stranger } = await loadFixture(deployFixture);
    await expect(badge.connect(stranger).claimBadge()).to.be.revertedWith(
      "AgentBadge: not an Agent ID holder"
    );
  });

  it("claim succeeds for a holder; hasBadge true; BadgeClaimed emitted", async function () {
    const { badge, holder } = await loadFixture(deployFixture);
    await expect(badge.connect(holder).claimBadge())
      .to.emit(badge, "BadgeClaimed")
      .withArgs(holder.address, 1);
    expect(await badge.hasBadge(holder.address)).to.equal(true);
    expect(await badge.balanceOf(holder.address)).to.equal(1);
    expect(await badge.ownerOf(1)).to.equal(holder.address);
    expect(await badge.tokenIdOf(holder.address)).to.equal(1);
  });

  it("one badge per holder: second claim reverts (even with multiple Agent IDs)", async function () {
    const { badge, holder, holder2 } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    await expect(badge.connect(holder).claimBadge()).to.be.revertedWith(
      "AgentBadge: badge already claimed"
    );
    await badge.connect(holder2).claimBadge();
    expect(await badge.balanceOf(holder2.address)).to.equal(1);
    await expect(badge.connect(holder2).claimBadge()).to.be.revertedWith(
      "AgentBadge: badge already claimed"
    );
  });

  it("badge is soulbound: transfer and safeTransferFrom revert", async function () {
    const { badge, holder, stranger } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    await expect(
      badge.connect(holder).transferFrom(holder.address, stranger.address, 1)
    ).to.be.revertedWith("AgentBadge: soulbound, transfers disabled");
    await expect(
      badge.connect(holder)["safeTransferFrom(address,address,uint256)"](
        holder.address,
        stranger.address,
        1
      )
    ).to.be.revertedWith("AgentBadge: soulbound, transfers disabled");
    expect(await badge.ownerOf(1)).to.equal(holder.address);
  });

  it("checkIn reverts without a badge", async function () {
    const { badge, stranger } = await loadFixture(deployFixture);
    await expect(badge.connect(stranger).checkIn()).to.be.revertedWith(
      "AgentBadge: no badge claimed"
    );
  });

  it("checkIn sets streak 1, emits CheckedIn, second same-day reverts", async function () {
    const { badge, holder } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    const day = Math.floor((await time.latest()) / DAY);
    await expect(badge.connect(holder).checkIn())
      .to.emit(badge, "CheckedIn")
      .withArgs(holder.address, 1, day);
    expect(await badge.streakOf(holder.address)).to.equal(1);
    expect(await badge.tierOf(holder.address)).to.equal("Bronze");
    await expect(badge.connect(holder).checkIn()).to.be.revertedWith(
      "AgentBadge: already checked in today"
    );
  });

  it("streak increments on consecutive days", async function () {
    const { badge, holder } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    await badge.connect(holder).checkIn();
    for (let i = 2; i <= 6; i++) {
      await checkInOnNextDay(badge, holder, 1);
      expect(await badge.streakOf(holder.address)).to.equal(i);
    }
    expect(await badge.tierOf(holder.address)).to.equal("Bronze"); // 6 < 7
    await checkInOnNextDay(badge, holder, 1);
    expect(await badge.streakOf(holder.address)).to.equal(7);
    expect(await badge.tierOf(holder.address)).to.equal("Silver");
  });

  it("streak resets after a missed day", async function () {
    const { badge, holder } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    await badge.connect(holder).checkIn();
    await checkInOnNextDay(badge, holder, 1); // streak 2
    await checkInOnNextDay(badge, holder, 1); // streak 3
    expect(await badge.streakOf(holder.address)).to.equal(3);
    await checkInOnNextDay(badge, holder, 2); // skip one full day
    expect(await badge.streakOf(holder.address)).to.equal(1);
    expect(await badge.tierOf(holder.address)).to.equal("Bronze");
  });

  it("tier thresholds: Bronze <7, Silver 7-29, Gold 30+", async function () {
    const { badge, holder } = await loadFixture(deployFixture);
    await badge.connect(holder).claimBadge();
    expect(await badge.tierOf(holder.address)).to.equal("Bronze"); // streak 0
    await badge.connect(holder).checkIn(); // day 1
    for (let i = 2; i <= 29; i++) {
      await checkInOnNextDay(badge, holder, 1);
      if (i === 7) expect(await badge.tierOf(holder.address)).to.equal("Silver");
      if (i === 29) expect(await badge.tierOf(holder.address)).to.equal("Silver");
    }
    expect(await badge.streakOf(holder.address)).to.equal(29);
    await checkInOnNextDay(badge, holder, 1); // day 30
    expect(await badge.streakOf(holder.address)).to.equal(30);
    expect(await badge.tierOf(holder.address)).to.equal("Gold");
  });
});

// loadFixture is provided by hardhat-toolbox via the network helpers import path
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
