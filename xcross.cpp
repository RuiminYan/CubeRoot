/*
 * xcross.cpp
 */

#include <iostream>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <string>
#include <omp.h>
#include <iomanip>
#include <cstring>
#include <chrono>

// =========================================================================================
// Timer Macros
// =========================================================================================

// Start the timer with a specific name prefix
#define TICK(x) auto x##_start = std::chrono::high_resolution_clock::now();

// Stop the timer, calculate duration, and print the result in seconds
#define TOCK(x) auto x##_end = std::chrono::high_resolution_clock::now(); \
                std::chrono::duration<double> x##_elapsed = x##_end - x##_start; \
                std::cout << " -> Time: " << std::fixed << std::setprecision(4) << x##_elapsed.count() << "s" << std::endl;

// =========================================================================================
// PART 1: Basis (Moves & Constants)
// =========================================================================================

// Standard notation for Rubik's Cube moves (HTM - Half Turn Metric)
std::vector<std::string> move_names = {
    "U", "U2", "U'", "D", "D2", "D'", 
    "L", "L2", "L'", "R", "R2", "R'", 
    "F", "F2", "F'", "B", "B2", "B'"
};

// Combinatorial helper arrays for ranking/unranking permutations and orientations
std::vector<std::vector<int>> c_array = {
    {0},
    {1, 1, 1, 1, 1, 1, 1},
    {1, 2, 4, 8, 16, 32, 64},
    {1, 3, 9, 27, 81, 243, 729}
};

std::vector<std::vector<int>> base_array = {
    {0},
    {0},
    {1, 12, 132, 1320, 11880, 95040},
    {1, 8, 56, 336, 1680, 6720}
};

std::vector<std::vector<int>> base_array2 = {
    {0},
    {0},
    {12, 11, 10, 9, 8, 7},
    {8, 7, 6, 5, 4, 3}
};

// Representation of a Cube State
// cp: Corner Permutation, co: Corner Orientation
// ep: Edge Permutation, eo: Edge Orientation
struct State {
    std::vector<int> cp, co, ep, eo;

    State(std::vector<int> c_p = {0, 1, 2, 3, 4, 5, 6, 7}, 
          std::vector<int> c_o = {0, 0, 0, 0, 0, 0, 0, 0}, 
          std::vector<int> e_p = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}, 
          std::vector<int> e_o = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}) 
        : cp(c_p), co(c_o), ep(e_p), eo(e_o) {}

    // Apply a move affecting specific edges
    State apply_move_edge(const State& m, int e) const {
        std::vector<int> nep(12, -1), neo(12, -1);
        auto it = std::find(ep.begin(), ep.end(), e); 
        int idx = std::distance(ep.begin(), it);
        
        it = std::find(m.ep.begin(), m.ep.end(), e); 
        int idx_next = std::distance(m.ep.begin(), it);
        
        nep[idx_next] = e; 
        neo[idx_next] = (eo[idx] + m.eo[idx_next]) % 2;
        return State(cp, co, nep, neo);
    }

    // Apply a move affecting specific corners
    State apply_move_corner(const State& m, int c) const {
        std::vector<int> ncp(8, -1), nco(8, -1);
        auto it = std::find(cp.begin(), cp.end(), c); 
        int idx = std::distance(cp.begin(), it);
        
        it = std::find(m.cp.begin(), m.cp.end(), c); 
        int idx_next = std::distance(m.cp.begin(), it);
        
        ncp[idx_next] = c; 
        nco[idx_next] = (co[idx] + m.co[idx_next]) % 3;
        return State(ncp, nco, ep, eo);
    }
};

// Definition of basic moves and their effect on the cube state
std::unordered_map<std::string, State> moves_map = {
    {"U", State({3,0,1,2,4,5,6,7}, {0,0,0,0,0,0,0,0}, {0,1,2,3,7,4,5,6,8,9,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"U2", State({2,3,0,1,4,5,6,7}, {0,0,0,0,0,0,0,0}, {0,1,2,3,6,7,4,5,8,9,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"U'", State({1,2,3,0,4,5,6,7}, {0,0,0,0,0,0,0,0}, {0,1,2,3,5,6,7,4,8,9,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"D", State({0,1,2,3,5,6,7,4}, {0,0,0,0,0,0,0,0}, {0,1,2,3,4,5,6,7,9,10,11,8}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"D2", State({0,1,2,3,6,7,4,5}, {0,0,0,0,0,0,0,0}, {0,1,2,3,4,5,6,7,10,11,8,9}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"D'", State({0,1,2,3,7,4,5,6}, {0,0,0,0,0,0,0,0}, {0,1,2,3,4,5,6,7,11,8,9,10}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"L", State({4,1,2,0,7,5,6,3}, {2,0,0,1,1,0,0,2}, {11,1,2,7,4,5,6,0,8,9,10,3}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"L2", State({7,1,2,4,3,5,6,0}, {0,0,0,0,0,0,0,0}, {3,1,2,0,4,5,6,11,8,9,10,7}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"L'", State({3,1,2,7,0,5,6,4}, {2,0,0,1,1,0,0,2}, {7,1,2,11,4,5,6,3,8,9,10,0}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"R", State({0,2,6,3,4,1,5,7}, {0,1,2,0,0,2,1,0}, {0,5,9,3,4,2,6,7,8,1,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"R2", State({0,6,5,3,4,2,1,7}, {0,0,0,0,0,0,0,0}, {0,2,1,3,4,9,6,7,8,5,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"R'", State({0,5,1,3,4,6,2,7}, {0,1,2,0,0,2,1,0}, {0,9,5,3,4,1,6,7,8,2,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"F", State({0,1,3,7,4,5,2,6}, {0,0,1,2,0,0,2,1}, {0,1,6,10,4,5,3,7,8,9,2,11}, {0,0,1,1,0,0,1,0,0,0,1,0})},
    {"F2", State({0,1,7,6,4,5,3,2}, {0,0,0,0,0,0,0,0}, {0,1,3,2,4,5,10,7,8,9,6,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"F'", State({0,1,6,2,4,5,7,3}, {0,0,1,2,0,0,2,1}, {0,1,10,6,4,5,2,7,8,9,3,11}, {0,0,1,1,0,0,1,0,0,0,1,0})},
    {"B", State({1,5,2,3,0,4,6,7}, {1,2,0,0,2,1,0,0}, {4,8,2,3,1,5,6,7,0,9,10,11}, {1,1,0,0,1,0,0,0,1,0,0,0})},
    {"B2", State({5,4,2,3,1,0,6,7}, {0,0,0,0,0,0,0,0}, {1,0,2,3,8,5,6,7,4,9,10,11}, {0,0,0,0,0,0,0,0,0,0,0,0})},
    {"B'", State({4,0,2,3,5,1,6,7}, {1,2,0,0,2,1,0,0}, {8,4,2,3,0,5,6,7,1,9,10,11}, {1,1,0,0,1,0,0,0,1,0,0,0})}
};

// Convert a permutation array to a unique integer index (Coordinate compression)
inline int array_to_index(std::vector<int> &a, int n, int c, int pn) {
    int idx_p = 0, idx_o = 0, tmp, tmp2 = 24 / pn;
    // Calculate Orientation Index
    for (int i = 0; i < n; ++i) { 
        idx_o += (a[i] % c) * c_array[c][n - i - 1]; 
        a[i] /= c; 
    }
    // Calculate Permutation Index (Lehmer code style)
    for (int i = 0; i < n; ++i) {
        tmp = 0; 
        for (int j = 0; j < i; ++j) if (a[j] < a[i]) tmp++;
        idx_p += (a[i] - tmp) * base_array[tmp2][i];
    }
    return idx_p * c_array[c][n] + idx_o;
}

// Convert a unique integer index back to a permutation array
inline void index_to_array(std::vector<int> &p, int index, int n, int c, int pn) {
    int tmp2 = 24 / pn, p_idx = index / c_array[c][n], o_idx = index % c_array[c][n];
    std::vector<int> local_sorted(n);
    // Recover Permutation
    for (int i = 0; i < n; ++i) {
        p[i] = p_idx % base_array2[tmp2][i]; 
        p_idx /= base_array2[tmp2][i];
        std::sort(local_sorted.begin(), local_sorted.begin() + i);
        for (int j = 0; j < i; ++j) if (local_sorted[j] <= p[i]) p[i]++;
        local_sorted[i] = p[i];
    }
    // Recover Orientation and combine
    for (int i = 0; i < n; ++i) { 
        p[n - i - 1] = 18 * (c * p[n - i - 1] + o_idx % c); 
        o_idx /= c; 
    }
}

// Generate Edge Move Table
std::vector<int> create_edge_move_table() {
    std::vector<int> mt(24 * 18, -1);
    for (int i = 0; i < 24; ++i) {
        State s; 
        s.ep = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}; 
        s.eo = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        
        // Setup initial state for edge 'i/2' with orientation 'i%2'
        s.ep[i / 2] = i / 2; 
        s.eo[i / 2] = i % 2;
        
        for (int j = 0; j < 18; ++j) {
            State ns = s.apply_move_edge(moves_map[move_names[j]], i / 2);
            auto it = std::find(ns.ep.begin(), ns.ep.end(), i / 2);
            int idx = std::distance(ns.ep.begin(), it);
            mt[18 * i + j] = 2 * idx + ns.eo[idx];
        }
    }
    return mt;
}

// Generate Corner Move Table
std::vector<int> create_corner_move_table() {
    std::vector<int> mt(24 * 18, -1);
    for (int i = 0; i < 24; ++i) {
        State s; 
        s.cp = {0, 1, 2, 3, 4, 5, 6, 7}; 
        s.co = {0, 0, 0, 0, 0, 0, 0, 0};
        
        // Setup initial state for corner 'i/3' with orientation 'i%3'
        s.cp[i / 3] = i / 3; 
        s.co[i / 3] = i % 3;
        
        for (int j = 0; j < 18; ++j) {
            State ns = s.apply_move_corner(moves_map[move_names[j]], i / 3);
            auto it = std::find(ns.cp.begin(), ns.cp.end(), i / 3);
            int idx = std::distance(ns.cp.begin(), it);
            mt[18 * i + j] = 3 * idx + ns.co[idx];
        }
    }
    return mt;
}

// Generate Multi-piece Move Table (Combined coordinate)
std::vector<int> create_multi_move_table(int n, int c, int pn, int size, const std::vector<int> &basic_t) {
    std::vector<int> mt(size * 24, -1);
    std::vector<int> a(n), b(n);
    // Inverse move indices for optimization
    std::vector<int> inv = {2, 1, 0, 5, 4, 3, 8, 7, 6, 11, 10, 9, 14, 13, 12, 17, 16, 15};
    
    for (int i = 0; i < size; ++i) {
        index_to_array(a, i, n, c, pn);
        int tmp_i = i * 24;
        for (int j = 0; j < 18; ++j) {
            if (mt[tmp_i + j] == -1) {
                // Apply move 'j' to all pieces in the coordinate
                for (int k = 0; k < n; ++k) b[k] = basic_t[a[k] + j];
                
                int tmp = 24 * array_to_index(b, n, c, pn);
                mt[tmp_i + j] = tmp;
                
                // Fill inverse move to save computation
                mt[tmp + inv[j]] = tmp_i;
            }
        }
    }
    return mt;
}

// =========================================================================================
// PART 2: Fixed Distance Table (Dual: BL and BR)
// =========================================================================================

// Global Pruning Tables
std::vector<unsigned char> table_bl;
std::vector<unsigned char> table_br;

// Constants defining the size of the coordinate space
const long long sz_cr = 190080; // Size of Cross permutation coordinate
const long long sz_cn = 24;     // Size of Corner coordinate
const long long sz_ed = 24;     // Size of Edge coordinate

// BFS to generate pruning table (distance to solved state)
void generate_table(std::vector<unsigned char> &table, int idx_cr, int idx_cn, int idx_ed, 
    const std::vector<int> &t1, const std::vector<int> &t2, const std::vector<int> &t3, const std::string &name) 
{
    long long total = sz_cr * sz_cn * sz_ed;
    std::cout << "[Step 2] Allocating " << name << "..." << std::flush;
    
    // Internal Timer for BFS
    auto t_start = std::chrono::high_resolution_clock::now();
    
    table.resize(total, 255); // Initialize with max value (unvisited)
    
    long long start_idx = ((long long)idx_cr * sz_cn + idx_cn) * sz_ed + idx_ed;
    table[start_idx] = 0; // Base case: distance 0
    
    int depth = 0;
    
    while(true) {
        long long count = 0;
        
        // Parallelized BFS expansion
        #pragma omp parallel for reduction(+:count)
        for(long long i = 0; i < total; ++i) {
            if(table[i] == depth) {
                // Decode combined index into separate coordinates
                int cur_ed = i % sz_ed;
                long long tmp = i / sz_ed;
                int cur_cn = tmp % sz_cn;
                int cur_cr = tmp / sz_cn;
                
                int t1_idx = cur_cr * 24;
                int t2_idx = cur_cn * 18;
                int t3_idx = cur_ed * 18;
                
                // Try all 18 moves
                for(int j = 0; j < 18; ++j) {
                    long long n_cr = t1[t1_idx + j] / 24;
                    int n_cn = t2[t2_idx + j];
                    int n_ed = t3[t3_idx + j];
                    long long ni = (n_cr * sz_cn + n_cn) * sz_ed + n_ed;
                    
                    if(table[ni] == 255) {
                        table[ni] = depth + 1;
                        count++;
                    }
                }
            }
        }
        if(count == 0) break; // BFS complete
        depth++;
    }
    
    auto t_end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> t_el = t_end - t_start;
    std::cout << " Done. (Max Depth: " << depth << ", Time: " << std::fixed << std::setprecision(2) << t_el.count() << "s)" << std::endl;
}

// =========================================================================================
// PART 3: Symmetry & Combinatorics (Optimized)
// =========================================================================================

// Symmetry mapping constants (y2 rotation)
const int y2_corn[8] = {2, 3, 0, 1, 6, 7, 4, 5};
const int y2_edge[12] = {2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9};

std::vector<int> cross_y2_map;
std::vector<int> masks_2bits; 
std::vector<std::pair<int, int>> disjoint_pairs; 

// Precompute the effect of y2 rotation on cross coordinates
void precompute_cross_y2() {
    cross_y2_map.resize(sz_cr);
    std::vector<int> p(4), p_transformed(4);
    for (int i = 0; i < sz_cr; ++i) {
        index_to_array(p, i, 4, 2, 12);
        std::vector<int> p_perm(4);
        // Permute pieces based on y2 symmetry
        p_perm[0] = p[2]; p_perm[1] = p[3]; p_perm[2] = p[0]; p_perm[3] = p[1];
        
        for(int k = 0; k < 4; ++k) {
            int val = p_perm[k] / 18;
            int pos = val / 2;
            int ori = val % 2;
            int new_p = y2_edge[pos]; // Map position
            int new_o = ori;          // Orientation is invariant under y2 for edges in this context
            p_transformed[k] = 18 * (2 * new_p + new_o);
        }
        std::vector<int> p_unscaled(4);
        for(int k = 0; k < 4; ++k) p_unscaled[k] = p_transformed[k] / 18;
        cross_y2_map[i] = array_to_index(p_unscaled, 4, 2, 12);
    }
}

// Initialize bitmasks for disjoint subsets used in the Meet-in-the-Middle step
void init_masks_opt() {
    masks_2bits.clear();
    for(int i = 0; i < 256; ++i) {
        if(__builtin_popcount(i) == 2) masks_2bits.push_back(i);
    }
    // Precompute disjoint pairs indices to avoid branching in the inner loop
    disjoint_pairs.clear();
    for(int i = 0; i < masks_2bits.size(); ++i) {
        for(int j = 0; j < masks_2bits.size(); ++j) {
            // If masks share no bits, they represent disjoint sets of pieces
            if((masks_2bits[i] & masks_2bits[j]) == 0) {
                disjoint_pairs.push_back({i, j});
            }
        }
    }
    std::cout << "[Init] Masks: " << masks_2bits.size() << ", Disjoint Pairs: " << disjoint_pairs.size() << std::endl;
}

// Helper to extract bit indices from a mask
inline void get_mask_indices(int mask, int &i1, int &i2) {
    i1 = -1; 
    for(int i = 0; i < 8; ++i) {
        if((mask >> i) & 1) {
            if(i1 == -1) i1 = i; else { i2 = i; break; }
        }
    }
}

// =========================================================================================
// MAIN
// =========================================================================================

int main() {
    auto global_start = std::chrono::high_resolution_clock::now();

    std::cout << "[Init] Generating Move Tables..." << std::flush;
    TICK(init);
    auto mt_edge = create_edge_move_table();
    auto mt_corn = create_corner_move_table();
    auto mt_multi = create_multi_move_table(4, 2, 12, sz_cr, mt_edge);
    TOCK(init);
    
    // Generate pruning tables for Left and Right sides
    generate_table(table_bl, 187520, 12, 0, mt_multi, mt_corn, mt_edge, "BL Table");
    generate_table(table_br, 187520, 15, 2, mt_multi, mt_corn, mt_edge, "BR Table");
    
    TICK(precomp);
    precompute_cross_y2();
    init_masks_opt();
    TOCK(precomp);
    
    std::cout << "[Step 4] Aggregating Non-Fixed Distribution (High Performance Mode)..." << std::endl;
    long long total_counts[20] = {0};
    
    TICK(search);
    
    // Main Parallel Loop over Cross States
    #pragma omp parallel
    {
        std::vector<long long> local_counts(20, 0);
        std::vector<int> free_corners(8), free_edges(8), p_cross(4);
        int dist_hist[4][8][8][14];
        int valid_ge_k[4][8][8][14]; // Histogram accumulation: [symmetry][c_idx][e_idx][min_dist]
        
        // Intermediate tables for Meet-in-the-Middle
        long long t_left[28][28][12];
        long long t_right[28][28][12];

        #pragma omp for schedule(dynamic, 100)
        for (int cr = 0; cr < sz_cr; ++cr) {
            index_to_array(p_cross, cr, 4, 2, 12);
            int mask_edges_used = 0;
            for(int val : p_cross) mask_edges_used |= (1 << ((val / 18) / 2));
            
            // Determine available free pieces
            int fc = 0, fe = 0;
            for(int i = 0; i < 8; ++i) free_corners[fc++] = i; 
            for(int i = 0; i < 12; ++i) if(!((mask_edges_used >> i) & 1)) free_edges[fe++] = i;
            
            int cr_rot = cross_y2_map[cr];
            std::memset(dist_hist, 0, sizeof(dist_hist));
            
            // 1. Build Histogram for single pieces relative to Cross
            int t_bl_idx = cr * sz_cn;
            int t_br_idx = cr * sz_cn;
            int t_bl_rot_idx = cr_rot * sz_cn;
            int t_br_rot_idx = cr_rot * sz_cn;

            for(int u = 0; u < 8; ++u) { 
                int real_c = free_corners[u];
                int c_y2 = y2_corn[real_c];
                int c_idx_01 = (3 * real_c);
                int c_idx_23 = (3 * c_y2);

                for(int v = 0; v < 8; ++v) { 
                    int real_e = free_edges[v];
                    int e_y2 = y2_edge[real_e];
                    int e_idx_01 = (2 * real_e);
                    int e_idx_23 = (2 * e_y2);

                    for(int co = 0; co < 3; ++co) {
                        for(int eo = 0; eo < 2; ++eo) {
                            // Look up distances in pruning tables
                            long long idx0 = (long long)(t_bl_idx + c_idx_01 + co) * sz_ed + (e_idx_01 + eo);
                            int d0 = table_bl[idx0];
                            if(d0 < 14) dist_hist[0][u][v][d0]++;
                            
                            long long idx1 = (long long)(t_br_idx + c_idx_01 + co) * sz_ed + (e_idx_01 + eo);
                            int d1 = table_br[idx1];
                            if(d1 < 14) dist_hist[1][u][v][d1]++;
                            
                            long long idx2 = (long long)(t_bl_rot_idx + c_idx_23 + co) * sz_ed + (e_idx_23 + eo);
                            int d2 = table_bl[idx2];
                            if(d2 < 14) dist_hist[2][u][v][d2]++;
                            
                            long long idx3 = (long long)(t_br_rot_idx + c_idx_23 + co) * sz_ed + (e_idx_23 + eo);
                            int d3 = table_br[idx3];
                            if(d3 < 14) dist_hist[3][u][v][d3]++;
                        }
                    }
                }
            }
            
            // 2. Compute Cumulative Sums for greater-than-or-equal logic
            for(int p = 0; p < 4; ++p) {
                for(int u = 0; u < 8; ++u) {
                    for(int v = 0; v < 8; ++v) {
                        int sum = 0;
                        for(int d = 13; d >= 0; --d) {
                            sum += dist_hist[p][u][v][d];
                            valid_ge_k[p][u][v][d] = sum;
                        }
                    }
                }
            }

            // 3. Meet-in-the-Middle: Combine subsets of pieces
            for(int i = 0; i < masks_2bits.size(); ++i) {
                int mc = masks_2bits[i];
                int c1, c2; get_mask_indices(mc, c1, c2); 
                for(int j = 0; j < masks_2bits.size(); ++j) {
                    int me = masks_2bits[j];
                    int e1, e2; get_mask_indices(me, e1, e2); 
                    
                    for(int k = 0; k < 12; ++k) {
                         // Combine left side possibilities
                         long long cnt_l = (long long)valid_ge_k[0][c1][e1][k] * valid_ge_k[1][c2][e2][k];
                         cnt_l += (long long)valid_ge_k[0][c1][e2][k] * valid_ge_k[1][c2][e1][k];
                         cnt_l += (long long)valid_ge_k[0][c2][e1][k] * valid_ge_k[1][c1][e2][k];
                         cnt_l += (long long)valid_ge_k[0][c2][e2][k] * valid_ge_k[1][c1][e1][k];
                         t_left[i][j][k] = cnt_l;

                         // Combine right side possibilities (symmetric)
                         long long cnt_r = (long long)valid_ge_k[2][c1][e1][k] * valid_ge_k[3][c2][e2][k];
                         cnt_r += (long long)valid_ge_k[2][c1][e2][k] * valid_ge_k[3][c2][e1][k];
                         cnt_r += (long long)valid_ge_k[2][c2][e1][k] * valid_ge_k[3][c1][e2][k];
                         cnt_r += (long long)valid_ge_k[2][c2][e2][k] * valid_ge_k[3][c1][e1][k];
                         t_right[i][j][k] = cnt_r;
                    }
                }
            }

            // 4. Join Step (Vectorized over K using precomputed disjoint pairs)
            for(const auto& pc : disjoint_pairs) {
                int mc1_idx = pc.first;
                int mc2_idx = pc.second;
                
                for(const auto& pe : disjoint_pairs) {
                    int me1_idx = pe.first;
                    int me2_idx = pe.second;
                    
                    // Unroll this inner loop for SIMD auto-vectorization
                    for(int k = 0; k < 12; ++k) {
                        local_counts[k] += t_left[mc1_idx][me1_idx][k] * t_right[mc2_idx][me2_idx][k];
                    }
                }
            }
        }
        
        #pragma omp critical
        {
            for(int d = 0; d < 20; ++d) total_counts[d] += local_counts[d];
        }
    }
    
    // Performance Metrics
    auto search_end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> search_el = search_end - search_start;
    double throughput = (double)sz_cr / search_el.count();
    
    std::cout << "Done. (Search Time: " << search_el.count() << "s, " 
              << "Speed: " << (int)throughput << " iter/s)" << std::endl;
    
    std::cout << "\n=== Final Distribution ===" << std::endl;
    long long grand_total = 0;
    std::cout.imbue(std::locale(""));
    
    long long exact_counts[20] = {0};
    for(int d = 0; d < 15; ++d) {
        exact_counts[d] = total_counts[d] - total_counts[d + 1];
    }
    
    for(int d = 0; d < 15; ++d) {
        if(exact_counts[d] > 0) {
            std::cout << d << "\t" << exact_counts[d] << std::endl;
            grand_total += exact_counts[d];
        }
    }
    
    auto global_end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> global_el = global_end - global_start;
    std::cout << "total\t" << grand_total << std::endl;
    std::cout << "\nTotal Execution Time: " << global_el.count() << "s" << std::endl;
    
    return 0;
}
