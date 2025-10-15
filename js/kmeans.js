// Simple K-Means clustering implementation for morse decoding
class KMeans {
    constructor(k, maxIterations = 100) {
        this.k = k;
        this.maxIterations = maxIterations;
        this.centroids = [];
        this.labels = [];
    }

    fit(data) {
        // Initialize centroids randomly
        const n = data.length;
        const indices = new Set();
        
        // Select k random points as initial centroids
        while (indices.size < this.k) {
            indices.add(Math.floor(Math.random() * n));
        }
        
        this.centroids = Array.from(indices).map(i => data[i]);
        
        // Iterate until convergence or max iterations
        for (let iter = 0; iter < this.maxIterations; iter++) {
            // Assign labels
            const oldLabels = [...this.labels];
            this.labels = data.map(point => this.closestCentroid(point));
            
            // Update centroids
            const newCentroids = [];
            for (let k = 0; k < this.k; k++) {
                const clusterPoints = data.filter((_, i) => this.labels[i] === k);
                if (clusterPoints.length > 0) {
                    newCentroids[k] = clusterPoints.reduce((a, b) => a + b, 0) / clusterPoints.length;
                } else {
                    newCentroids[k] = this.centroids[k];
                }
            }
            
            this.centroids = newCentroids;
            
            // Check convergence
            if (JSON.stringify(oldLabels) === JSON.stringify(this.labels)) {
                break;
            }
        }
        
        return this;
    }

    closestCentroid(point) {
        let minDist = Infinity;
        let closest = 0;
        
        for (let i = 0; i < this.centroids.length; i++) {
            const dist = Math.abs(point - this.centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        
        return closest;
    }

    predict(point) {
        return this.closestCentroid(point);
    }

    getCentroids() {
        return this.centroids;
    }

    getLabels() {
        return this.labels;
    }
}
