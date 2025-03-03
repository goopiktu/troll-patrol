// MIT License Copyright © 2012-2015 Karan Lyons, Sascha Droste 
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), 
// to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
import { v3 as MurmurHash3 } from 'murmurhash-js';

class BloomFilter { 
    
    // Creates a Bloom filter with the variables m and k.
    // m can either be an array-like object with a length
    // or m can be the number of bits of the created Bloom filter.
    // If m = array-like object, just load m into a and calculate bits.
    // If m = bits, it is rounded up to the nearest multiple of 32.
    // k = number of hashing functions
    // buckets = stores filter bits in 32 bit array
    // indexes = stores hashed results during insertion
    constructor(m, k) { 
        let a; 
        if (typeof m !== "number") { 
            a = m; m = a.length * 32; 
        }
        const n = Math.ceil(m / 32);
        let i = -1;
        this.m = n * 32;
        this.k = k;
        this.buckets = new Int32Array(n);
        if (a) {
            while (++i < n) {
                this.buckets[i] = a[i];
            }
        }
        this.indexes = new Uint32Array(new ArrayBuffer(4 * k));
    }

    locations(v) {
        var k = this.k;
        var m = this.m;
        var r = this.indexes
        var a = MurmurHash3(v);
        var b = MurmurHash3(v,2369007371); // Randomly chosen seed from 32 bit integer
        var x = a % m;
        for (var i = 0; i < k; i++) {
            r[i] = x < 0 ? (x+m) : x;
            x = (x+b) % m;
        }
        return r;
    }

    add(v) {
        var l = this.locations(v + ""),
            k = this.k,
            buckets = this.buckets;
        for (var i = 0; i < k; ++i) {
            buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
        }
    }

    check(v) {
        var l = this.locations(v + "");
        var k = this.k;
        var buckets = this.buckets;
        for (var i = 0; i < k; ++i) {
          var b = l[i];
          if ((buckets[Math.floor(b / 32)] & (1 << (b % 32))) === 0) {
            return false;
          }
        }
        return true;
      };
    
    // The total number of set bits obtained from countSetBits() is used in the formula 
    // to estimate how many unique elements have been added to the Bloom filter. 
    // The more bits that are set, the higher the estimated cardinality.
    size(){
        var buckets = this.buckets;
        var bits = 0;
        for (var i = 0, n = buckets.length; i < n; ++i) {
            bits += countSetBits(buckets[i]);
        }
        return -this.m * Math.log(1 - bits / this.m) / this.k;
    }
    
    // This method is used to count the number of bits that are set to 1 in each bucket of the Bloom filter.
    // This count is crucial for estimating the number of elements in the set.
    countSetBits(n) {
        n = n - ((n >> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
        n = (n + (n >> 4)) & 0x0F0F0F0F;
        n = n + (n >> 8);
        n = n + (n >> 16);
        return n & 0x3F;
    }
}

// Call this class when importing from DB
class CombinedBloomFilter {
    constructor(name) {
        this.name = name;
        this.parts = [];
    }

    static getIdForPart(v, i) {
        return i === 0 ? v : v + '|' + i;
    }

    check(v) {
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i];
            const id = CombinedBloomFilter.getIdForPart(v, i);
            if (part.test(id)) return true;
        }
        return false;
    }
}