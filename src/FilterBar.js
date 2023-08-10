import { useState } from 'react';

const FilterBar = ({ value, onValueChange }) =>
{
    const [inputValue, setInputValue] = useState(value ?? '');

    const handleInputValueChange = (event) => setInputValue(event.target.value);

    return (
        <div className="filter-bar">
            <form>
                <label>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputValueChange}
                    />
                </label>
                <input type="button" value="Filter" onClick={() => onValueChange(inputValue)} />
            </form>
        </div>
    );
};

export default FilterBar;
