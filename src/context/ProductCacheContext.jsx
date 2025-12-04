import React, { createContext, useContext, useState } from "react";

const ProductCacheContext = createContext();

export const ProductCacheProvider = ({ children }) => {
    const [cache, setCache] = useState({}); // { id: product }

    const saveProductsToCache = (list) => {
        const newCache = { ...cache };
        list.forEach((p) => {
            newCache[p.id] = p;
        });
        setCache(newCache);
    };

    const getProductById = (id) => {
        return cache[id] || null;
    };

    return (
        <ProductCacheContext.Provider value={{ cache, saveProductsToCache, getProductById }}>
            {children}
        </ProductCacheContext.Provider>
    );
};

export const useProductCache = () => useContext(ProductCacheContext);
