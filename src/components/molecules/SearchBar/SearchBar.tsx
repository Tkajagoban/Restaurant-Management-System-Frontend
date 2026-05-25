import React from 'react';
import { Input } from '../../atoms/Input/Input';
import styles from './SearchBar.module.css';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onSearch: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, className = '', ...props }) => {
    return (
        <div className={`${styles.searchBar} ${className}`}>
            <Input
                type="search"
                placeholder="Search..."
                onChange={(e) => onSearch(e.target.value)}
                {...props}
            />
        </div>
    );
};
