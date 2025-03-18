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
        this.m = n * 32;
        this.k = k;
        this.buckets = new Int32Array(n);
        if (a) {
            for (let i = 0; i < n; i++) {
                this.buckets[i] = a[i];
            }
        }
        this.indexes = new Uint32Array(new ArrayBuffer(4 * k));
    }

    // Fowler–Noll–Vo hash function
    // FNV_OFFSET_BASIS = which is the initial hash value
    // FNV_prime = prime number used in the hashing process.
    // Returns value for indexing in Bloom filter.
    fnv1aHash(value) {
        const FNV_OFFSET_BASIS = 0xCBF29CE484222325n;
        const FNV_prime = 0x100000001B3n;
        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < value.length; i++) {
            hash ^= BigInt(value.charCodeAt(i));
            hash *= FNV_prime;
        }
        return hash;
    }

    // The function first retrieves the indexes array from the Bloom filter instance. 
    // It then computes two hash values using the fnv1aHash function.
    // k = number of hash functions (or indices)
    // r  = computed indices. Indices for setting or checking bits in the Bloom filter.
    locations(v) {
        const r = this.indexes;
        const hash1 = this.fnv1aHash(v);
        const hash2 = this.fnv1aHash(v + "salt");
        for (let i = 0; i < this.k; i++) {
            r[i] = Number((hash1 + BigInt(i) * hash2) % BigInt(this.m));
        }
        return r;
    }

    add(v) {
        const l = this.locations(v + "");
        for (let i = 0; i < this.k; i++) {
            this.buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
        }
    }

    check(v) {
        const l = this.locations(v + "");
        for (let i = 0; i < this.k; i++) {
            const b = l[i];
            if ((this.buckets[Math.floor(b / 32)] & (1 << (b % 32))) === 0) {
                return false;
            }
        }
        return true;
    }

    // The total number of set bits obtained from countSetBits() is used in the formula 
    // to estimate how many unique elements have been added to the Bloom filter.
    // The more bits that are set, the higher the number of elements in the set.
    size() {
        let bits = 0;
        for (let i = 0; i < this.buckets.length; i++) {
            bits += this.countSetBits(this.buckets[i]);
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

    async save(key, version) {
        const data = {
            version: version,
            reportedUsers: Array.from(this.buckets)
        };
        await browser.storage.local.set({ [key]: JSON.stringify(data) });
        const verification = await this.load(key);
        if (!verification || verification.version !== version) {
            console.error('Failed to save data correctly.');
        } else {
            console.log('Data saved and verified successfully.');
        }
    }
    
    async load(key) {
        const result = await browser.storage.local.get(key);
        if (result[key]) {
            const parsedData = JSON.parse(result[key]);
            this.buckets = new Int32Array(parsedData.reportedUsers);
            this.m = this.buckets.length * 32;
            const version = parsedData.version;
            console.log(`Loaded from local storage: ${key} with version: ${version}`);
            return { version };
        } else {
            console.log(`No data found for key: ${key}`);
            return null;
        }
    }

    // Combines two arrays of buckets by performing a bitwise OR operation on corresponding elements
    // It first checks if the sizes of the two arrays match; if not, it logs an error and exits. 
    // If the sizes are the same, it updates the current buckets with the merged values and logs a success message.
    merge(newBuckets) {
        if (newBuckets.length !== this.buckets.length) {
            console.error('Bucket size mismatch. Cannot merge filters.');
            return;
        }
        for (let i = 0; i < this.buckets.length; i++) {
            this.buckets[i] |= newBuckets[i];
        }
        console.log('Merge successful.');
    }

    async fetchFromGitHub(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error, status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // This method asynchronously updates local reported user data by fetching it from a 
    // specified GitHub URL and comparing its version with the local version.
    // If the remote data is valid and has a newer version, 
    // it merges the remote buckets into the local buckets.
    // If their sizes differ, buckets are reinitialized.
    async updateFromGitHub(url) {
        const localData = await this.load('reportedUsers');
        const localVersion = localData ? localData.version : 0;
        const remoteData = await this.fetchFromGitHub(url);
        if (!remoteData?.reportedUsers) {
            console.log('No valid remote data found.');
            return;
        }
        let parsedData;
        try {
            parsedData = JSON.parse(remoteData.reportedUsers);
        } catch (error) {
            console.error('Error parsing reportedUsers JSON:', error);
            return;
        }
        if (!parsedData?.version || !parsedData?.reportedUsers) {
            console.log('Invalid data structure after parsing.');
            return;
        }
        const remoteVersion = parsedData.version;
        if (remoteVersion > localVersion) {
            console.log(`Merging from version ${localVersion} to ${remoteVersion}`);
            const remoteBuckets = new Int32Array(parsedData.reportedUsers);
    
            if (remoteBuckets.length !== this.buckets.length) {
                console.warn('Reinitializing buckets due to size mismatch.');
                this.buckets = new Int32Array(remoteBuckets.length);
            }
            this.merge(remoteBuckets);
            await this.save('reportedUsers', remoteVersion);
        } else {
            console.log('Local data is up-to-date. No merge needed.');
        }
    }
    
    // This function gets the current version of the Bloom filter.
    static async getVersion(key) {
        const result = await browser.storage.local.get(key);
        if (result[key]) {
            try {
                const parsedData = JSON.parse(result[key]);
                return parsedData.version || 0;
            } catch (e) {
                console.error('Error parsing stored data:', e);
                return 0;
            }
        }
        return 0;
    }
}