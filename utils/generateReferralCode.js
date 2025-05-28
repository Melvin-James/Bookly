function generateReferralCode(name) {
  return name.toUpperCase().slice(0, 4) + Math.floor(1000 + Math.random() * 9000);
}

module.exports = generateReferralCode;