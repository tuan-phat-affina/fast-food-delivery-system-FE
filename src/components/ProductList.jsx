import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Product from "./Product";
import Banner from "./Banner";
import "./ProductList.css";

function ProductList({ onAdd }) {
    const location = useLocation();
    const initialSearch = new URLSearchParams(location.search).get("search") || "";

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState("default");
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(200000);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });
    const [loadingProducts, setLoadingProducts] = useState(true);

    const productsPerPage = 6;
    const bannerImages = ["src/images/Banner2.png", "src/images/Banner3.png", "src/images/Banner3.png"];

    // ===========================
    // CALL API BACKEND
    // ===========================
    const fetchProducts = async () => {
        setLoadingProducts(true);

        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: productsPerPage,
                sort: getSortQuery(sortOption),
                search: searchTerm || "",
                filter: buildFilter(),
            });

            const response = await fetch(`http://localhost:8080/api/dishes?${params}`);
            const json = await response.json();

            const list = json?.data?.items || [];
            setProducts(list);

            // price auto calc
            if (list.length > 0) {
                const prices = list.map((p) => Number(p.price ?? 0));
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                setPriceRange({ min, max });
                setMinPrice(min);
                setMaxPrice(max);
            }
        } catch (err) {
            console.error("Lỗi khi gọi API BE:", err);
        } finally {
            setLoadingProducts(false);
        }
    };

    // sort convert
    const getSortQuery = (sortOption) => {
        switch (sortOption) {
            case "price-asc":
                return "price,asc";
            case "price-desc":
                return "price,desc";
            case "name-asc":
                return "name,asc";
            case "name-desc":
                return "name,desc";
            default:
                return "id,desc";
        }
    };

    // filters convert to RSQL
    const buildFilter = () => {
        let filters = [];
        filters.push(`price>=${minPrice};price<=${maxPrice}`);
        return filters.join(";");
    };

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line
    }, [currentPage, sortOption, minPrice, maxPrice, searchTerm]);

    // search sync
    useEffect(() => {
        const q = new URLSearchParams(location.search).get("search") || "";
        setSearchTerm(q);
        setCurrentPage(1);
    }, [location.search]);

    const resetFilters = () => {
        setSortOption("default");
        const { min, max } = priceRange;
        setMinPrice(min);
        setMaxPrice(max);
        setSearchTerm("");
        setCurrentPage(1);
    };

    return (
        <div className="main-home">
            <Banner images={bannerImages} />

            <div className="main-title">
                <h1>Hôm nay ăn gì?</h1>
            </div>

            <div className="content-wrapper">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Tìm món ăn..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <button className="reset-filters" onClick={resetFilters}>Xóa bộ lọc</button>

                    <h3>Lọc theo giá</h3>
                    <div className="price-filter">
                        <label>Từ:</label>
                        <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(Number(e.target.value))}
                        />

                        <label>Đến:</label>
                        <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                        />

                        <p>
                            Khoảng giá:{" "}
                            <strong>
                                {minPrice.toLocaleString()}₫ - {maxPrice.toLocaleString()}₫
                            </strong>
                        </p>
                    </div>

                    <h3>Sắp xếp</h3>
                    <div className="sort-filter">
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                            <option value="default">Mặc định</option>
                            <option value="price-asc">Giá tăng dần</option>
                            <option value="price-desc">Giá giảm dần</option>
                            <option value="name-asc">Tên A → Z</option>
                            <option value="name-desc">Tên Z → A</option>
                        </select>
                    </div>
                </aside>

                {/* PRODUCT LIST */}
                <div className="product-show">
                    <div className="product-grid">
                        {!loadingProducts && products.length > 0 ? (
                            products.map((p) => (
                                <Product key={p.id} product={p} onAdd={onAdd} />
                            ))
                        ) : (
                            <p>Không tìm thấy sản phẩm nào</p>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Prev
                        </button>

                        <button
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductList;
