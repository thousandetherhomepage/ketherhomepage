const address = {
  normalize(addr) {
    if (!addr) return addr;
    return addr.toLowerCase();
  },

  equal(addr1, addr2) {
    return this.normalize(addr1) === this.normalize(addr2);
  }
};

export default (_context, inject) => {
  inject('address', address);
}