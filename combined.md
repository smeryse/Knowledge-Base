# Задачи на структуры данных

## Задача 1. Polynomial
```csharp
public class Polynomial
{
    private decimal[] _coeffs; // коэффициенты от 0-й степени

    public Polynomial()
    {
        _coeffs = Array.Empty<decimal>();
    }

    public Polynomial(decimal[] coefficients)
    {
        _coeffs = TrimTrailingZeros(coefficients ?? throw new ArgumentNullException(nameof(coefficients)));
    }

    public Polynomial(IEnumerable<(int power, decimal coefficient)> terms)
    {
        if (terms == null) throw new ArgumentNullException(nameof(terms));
        var dict = new Dictionary<int, decimal>();
        int maxPower = 0;
        foreach (var (p, c) in terms)
        {
            if (p < 0) throw new ArgumentException("Power cannot be negative");
            dict[p] = c;
            maxPower = Math.Max(maxPower, p);
        }
        _coeffs = new decimal[maxPower + 1];
        foreach (var (p, c) in dict)
            _coeffs[p] = c;
        _coeffs = TrimTrailingZeros(_coeffs);
    }

    public Polynomial(Polynomial other)
    {
        if (other == null) throw new ArgumentNullException(nameof(other));
        _coeffs = (decimal[])other._coeffs.Clone();
    }

    public int Degree => _coeffs.Length == 0 ? 0 : _coeffs.Length - 1;

    public decimal Evaluate(decimal x)
    {
        decimal result = 0;
        decimal power = 1;
        for (int i = 0; i < _coeffs.Length; i++)
        {
            result += _coeffs[i] * power;
            power *= x;
        }
        return result;
    }

    public void Add(Polynomial other)
    {
        if (other == null) throw new ArgumentNullException(nameof(other));
        int maxLen = Math.Max(_coeffs.Length, other._coeffs.Length);
        var result = new decimal[maxLen];
        for (int i = 0; i < _coeffs.Length; i++) result[i] += _coeffs[i];
        for (int i = 0; i < other._coeffs.Length; i++) result[i] += other._coeffs[i];
        _coeffs = TrimTrailingZeros(result);
    }

    public void Subtract(Polynomial other)
    {
        if (other == null) throw new ArgumentNullException(nameof(other));
        int maxLen = Math.Max(_coeffs.Length, other._coeffs.Length);
        var result = new decimal[maxLen];
        for (int i = 0; i < _coeffs.Length; i++) result[i] += _coeffs[i];
        for (int i = 0; i < other._coeffs.Length; i++) result[i] -= other._coeffs[i];
        _coeffs = TrimTrailingZeros(result);
    }

    public void MultiplyByScalar(decimal k)
    {
        for (int i = 0; i < _coeffs.Length; i++)
            _coeffs[i] *= k;
    }

    public Polynomial Derivative()
    {
        if (_coeffs.Length <= 1) return new Polynomial();
        var deriv = new decimal[_coeffs.Length - 1];
        for (int i = 1; i < _coeffs.Length; i++)
            deriv[i - 1] = _coeffs[i] * i;
        return new Polynomial(deriv);
    }

    private static decimal[] TrimTrailingZeros(decimal[] arr)
    {
        int last = arr.Length - 1;
        while (last >= 0 && arr[last] == 0) last--;
        if (last == -1) return Array.Empty<decimal>();
        var result = new decimal[last + 1];
        Array.Copy(arr, result, last + 1);
        return result;
    }

    public decimal this[int power]
    {
        get
        {
            if (power < 0) throw new ArgumentOutOfRangeException(nameof(power));
            if (power >= _coeffs.Length) return 0;
            return _coeffs[power];
        }
        set
        {
            if (power < 0) throw new ArgumentOutOfRangeException(nameof(power));
            if (power >= _coeffs.Length)
                Array.Resize(ref _coeffs, power + 1);
            _coeffs[power] = value;
            _coeffs = TrimTrailingZeros(_coeffs);
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not Polynomial other) return false;
        if (_coeffs.Length != other._coeffs.Length) return false;
        for (int i = 0; i < _coeffs.Length; i++)
            if (_coeffs[i] != other._coeffs[i]) return false;
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        foreach (var c in _coeffs)
            hash = hash * 31 + c.GetHashCode();
        return hash;
    }

    public override string ToString()
    {
        if (_coeffs.Length == 0) return "0";
        var parts = new List<string>();
        for (int i = _coeffs.Length - 1; i >= 0; i--)
        {
            if (_coeffs[i] == 0) continue;
            string term;
            if (i == 0) term = $"{_coeffs[i]}";
            else if (i == 1) term = _coeffs[i] == 1 ? "x" : _coeffs[i] == -1 ? "-x" : $"{_coeffs[i]}x";
            else term = _coeffs[i] == 1 ? $"x^{i}" : _coeffs[i] == -1 ? $"-x^{i}" : $"{_coeffs[i]}x^{i}";
            parts.Add(term);
        }
        return string.Join(" + ", parts).Replace(" + -", " - ");
    }
}
```

### Объяснение задачи 1. Polynomial

**Назначение:** Класс `Polynomial` реализует многочлен (полином) от одной переменной с коэффициентами типа `decimal`. Коэффициенты хранятся от младшей степени (индекс 0 — свободный член) к старшей. Нулевые старшие коэффициенты автоматически отбрасываются — это гарантирует, что массив «настоящей» длины соответствует степени многочлена.

**Хранение данных:**
- `_coeffs` (`decimal[]`) — массив коэффициентов, где `_coeffs[i]` — коэффициент при xⁱ. Например, для многочлена `3x² + 0x + 5` массив будет `[5, 0, 3]`.

**Конструкторы:**
- `Polynomial()` — пустой многочлен (нулевой).
- `Polynomial(decimal[] coeffs)` — из готового массива, с обрезкой хвостовых нулей.
- `Polynomial(IEnumerable<(int, decimal)> terms)` — из списка слагаемых (степень, коэффициент). Использует словарь для суммирования одноимённых членов.
- `Polynomial(Polynomial other)` — копирующий конструктор.

**Основные операции:**
- `Evaluate(decimal x)` — вычисляет значение многочлена в точке x по **схеме Горнера**: проходит от младшей степени к старшей, накапливая результат и домножая на x на каждом шаге. Это O(n), без лишних вычислений степеней.
- `Add(Polynomial other)` — поэлементное сложение коэффициентов до максимума из двух длин.
- `Subtract(Polynomial other)` — аналогично, но с вычитанием.
- `MultiplyByScalar(decimal k)` — умножение всех коэффициентов на скаляр.
- `Derivative()` — вычисляет производную: `coeff[i] → coeff[i+1] * (i+1)`. Длина массива уменьшается на 1.

**Вспомогательные:**
- `TrimTrailingZeros` — статический метод, обрезающий нулевые старшие коэффициенты. Критичен для корректного сравнения многочленов.
- `this[int power]` — индексатор для доступа к коэффициенту по степени. При записи автоматически расширяет массив, если степень превышает текущий размер.
- `Equals` — поэлементное сравнение массивов (после обрезки длины должны совпадать).
- `ToString` — строит строку вида `3x² + 2x — 1`, обрабатывая особые случаи (коэффициент 1, -1, степень 0 и 1).

**Сложность:** Все арифметические операции — O(n), где n — степень многочлена. Память — O(n).

## Задача 2. SparseVector

```csharp
public class SparseVector
{
    private readonly int _length;
    private readonly SortedDictionary<int, double> _values;

    public SparseVector(int length)
    {
        if (length < 0) throw new ArgumentException("Length cannot be negative");
        _length = length;
        _values = new SortedDictionary<int, double>();
    }

    public SparseVector(int length, IEnumerable<(int index, double value)> values) : this(length)
    {
        if (values == null) throw new ArgumentNullException(nameof(values));
        foreach (var (idx, val) in values)
        {
            if (idx < 0 || idx >= length) throw new ArgumentOutOfRangeException(nameof(idx));
            if (val != 0)
                _values[idx] = val;
        }
    }

    public SparseVector(double[] dense) : this(dense != null ? dense.Length : throw new ArgumentNullException(nameof(dense)))
    {
        for (int i = 0; i < dense.Length; i++)
            if (dense[i] != 0)
                _values[i] = dense[i];
    }

    public int Length => _length;
    public int GetNonZeroCount() => _values.Count;

    public double this[int index]
    {
        get
        {
            if (index < 0 || index >= _length) throw new ArgumentOutOfRangeException(nameof(index));
            return _values.GetValueOrDefault(index, 0);
        }
        set
        {
            if (index < 0 || index >= _length) throw new ArgumentOutOfRangeException(nameof(index));
            if (value == 0)
                _values.Remove(index);
            else
                _values[index] = value;
        }
    }

    public void Add(SparseVector other)
    {
        if (other == null) throw new ArgumentNullException(nameof(other));
        if (_length != other._length) throw new ArgumentException("Lengths must match");
        foreach (var (idx, val) in other._values)
            this[idx] = this[idx] + val;
    }

    public double Dot(SparseVector other)
    {
        if (other == null) throw new ArgumentNullException(nameof(other));
        if (_length != other._length) throw new ArgumentException("Lengths must match");
        double sum = 0;
        // проходим по меньшему словарю
        var smaller = _values.Count <= other._values.Count ? _values : other._values;
        var larger = _values.Count > other._values.Count ? _values : other._values;
        foreach (var (idx, val) in smaller)
            if (larger.ContainsKey(idx))
                sum += val * larger[idx];
        return sum;
    }

    public double Norm()
    {
        double sum = 0;
        foreach (var val in _values.Values)
            sum += val * val;
        return Math.Sqrt(sum);
    }

    public double[] ToDenseArray()
    {
        var result = new double[_length];
        foreach (var (idx, val) in _values)
            result[idx] = val;
        return result;
    }

    public void Clear() => _values.Clear();

    public override bool Equals(object? obj)
    {
        if (obj is not SparseVector other) return false;
        if (_length != other._length) return false;
        foreach (var (idx, val) in _values)
            if (other[idx] != val) return false;
        // проверяем, нет ли ненулевых в other, которых нет в this
        foreach (var (idx, val) in other._values)
            if (_values.ContainsKey(idx) && _values[idx] != val) return false;
            else if (!_values.ContainsKey(idx) && val != 0) return false;
        return true;
    }

    public override int GetHashCode()
    {
        int hash = _length.GetHashCode();
        foreach (var (idx, val) in _values)
            hash = HashCode.Combine(hash, idx, val);
        return hash;
    }

    public override string ToString()
    {
        var parts = _values.Select(kv => $"{kv.Key}:{kv.Value}");
        return $"SparseVector(length={_length}; {string.Join(", ", parts)})";
    }
}
```

### Объяснение задачи 2. SparseVector

**Назначение:** Разреженный вектор — структура, эффективно представляющая вектор, в котором большинство элементов равны нулю. Вместо хранения всего массива (length) хранятся только ненулевые позиции, что экономит память при высокой разреженности.

**Хранение данных:**
- `_length` — длина вектора.
- `_values` (`SortedDictionary<int, double>`) — словарь, где ключ — индекс, значение — ненулевой элемент. `SortedDictionary` гарантирует обход по возрастанию индексов, что удобно для операций вроде `ToDenseArray` и сравнения.

**Конструкторы:**
- От `int length` — пустой разреженный вектор с нулевыми элементами.
- От `(int length, IEnumerable<(int, double)>)` — заполнение из пар (индекс, значение). Нулевые значения игнорируются.
- От `double[]` — конвертация плотного массива в разреженное представление.

**Основные операции:**
- `this[int index]` — геттер возвращает 0, если ключа нет в словаре; сеттер автоматически удаляет ключ, если новое значение — 0 (поддержание инварианта).
- `Add(SparseVector other)` — проходит по словарю другого вектора и прибавляет каждый элемент через индексатор (который обработает появление нуля).
- `Dot(SparseVector other)` — скалярное произведение. Оптимизация: идём по **меньшему** словарю, для каждого элемента проверяем наличие в бóльшем. Это O(min(nnz₁, nnz₂)), где nnz — число ненулевых элементов.
- `Norm()` — евклидова норма: sqrt(Σ val²) по всем ненулевым элементам.
- `ToDenseArray()` — восстанавливает плотное представление (массив длины `_length`).
- `Clear()` — очищает словарь.

**Equals/ToString:**
- `Equals` — сравнение с учётом: все позиции, присутствующие в `this`, должны совпадать; в `other` на местах, отсутствующих в `this`, должны быть нули.
- `ToString` — вывод в формате `SparseVector(length=N; idx1:val1, idx2:val2, ...)`.

**Сложность:** Все операции O(nnz) по числу ненулевых элементов (или O(min(nnz₁, nnz₂)) для Dot). Память — O(nnz). Идеально для векторов размерности 10⁶ с десятками ненулевых элементов.

## Задача 3. MyArrayList\<T\>

```csharp
public class MyArrayList<T>
{
    private T[] _items;
    private int _count;

    public MyArrayList() : this(4) { }

    public MyArrayList(int capacity)
    {
        if (capacity < 0) throw new ArgumentException("Capacity cannot be negative");
        _items = new T[capacity];
        _count = 0;
    }

    public MyArrayList(IEnumerable<T> items)
    {
        if (items == null) throw new ArgumentNullException(nameof(items));
        _items = items.ToArray();
        _count = _items.Length;
    }

    public int Count => _count;
    public int Capacity => _items.Length;

    public void Add(T item)
    {
        if (_count == _items.Length)
            Array.Resize(ref _items, _items.Length * 2);
        _items[_count++] = item;
    }

    public void Insert(int index, T item)
    {
        if (index < 0 || index > _count)
            throw new ArgumentOutOfRangeException(nameof(index));
        if (_count == _items.Length)
            Array.Resize(ref _items, _items.Length * 2);
        for (int i = _count; i > index; i--)
            _items[i] = _items[i - 1];
        _items[index] = item;
        _count++;
    }

    public void RemoveAt(int index)
    {
        if (index < 0 || index >= _count)
            throw new ArgumentOutOfRangeException(nameof(index));
        for (int i = index; i < _count - 1; i++)
            _items[i] = _items[i + 1];
        _items[--_count] = default!;
    }

    public bool Contains(T item)
    {
        var comparer = EqualityComparer<T>.Default;
        for (int i = 0; i < _count; i++)
            if (comparer.Equals(_items[i], item))
                return true;
        return false;
    }

    public void Clear()
    {
        Array.Clear(_items, 0, _count);
        _count = 0;
    }

    public T[] ToArray()
    {
        var result = new T[_count];
        Array.Copy(_items, result, _count);
        return result;
    }

    public T this[int index]
    {
        get
        {
            if (index < 0 || index >= _count)
                throw new ArgumentOutOfRangeException(nameof(index));
            return _items[index];
        }
        set
        {
            if (index < 0 || index >= _count)
                throw new ArgumentOutOfRangeException(nameof(index));
            _items[index] = value;
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyArrayList<T> other) return false;
        if (_count != other._count) return false;
        var comparer = EqualityComparer<T>.Default;
        for (int i = 0; i < _count; i++)
            if (!comparer.Equals(_items[i], other._items[i]))
                return false;
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        for (int i = 0; i < _count; i++)
            hash = HashCode.Combine(hash, _items[i]);
        return hash;
    }

    public override string ToString()
    {
        var parts = new string[_count];
        for (int i = 0; i < _count; i++)
            parts[i] = _items[i]?.ToString() ?? "null";
        return $"MyArrayList(count={_count}; [{string.Join(", ", parts)}])";
    }
}
```

### Объяснение задачи 3. MyArrayList\<T\>

**Назначение:** Динамический массив — аналог встроенного `List<T>`. Предоставляет массив с автоматическим расширением, доступ по индексу за O(1) и вставку/удаление за O(n).

**Хранение данных:**
- `_items` (`T[]`) — внутренний массив (буфер).
- `_count` — количество реально занятых элементов (всегда ≤ длина `_items`).

**Конструкторы:**
- `MyArrayList()` — создаёт буфер на 4 элемента.
- `MyArrayList(int capacity)` — буфер заданной ёмкости.
- `MyArrayList(IEnumerable<T> items)` — копирует элементы из перечисления.

**Расширение (Resize):** При `Add` или `Insert`, если `_count == _items.Length`, массив удваивается (`Array.Resize`). Амортизированная сложность вставки — O(1). Ёмкость растёт геометрически, поэтому редкие расширения компенсируются постоянным временем вставки.

**Основные операции:**
- `Add(T item)` — вставляет в конец: O(1) амортизированно.
- `Insert(int index, T item)` — сдвигает элементы от index до конца вправо: O(n).
- `RemoveAt(int index)` — сдвигает элементы влево, затирает последний: O(n).
- `Contains(T item)` — линейный поиск: O(n).
- `Clear()` — зануляет занятые позиции через `Array.Clear`.
- `ToArray()` — создаёт копию заполненной части массива.
- `this[int index]` — доступ по индексу с проверкой границ: O(1).

**Equals/ToString:**
- `Equals` — поэлементное сравнение.
- `ToString` — вывод в формате `MyArrayList(count=N; [item1, item2, ...])`.

**Сложность:** O(1) доступ по индексу, O(n) вставка/удаление в середине, O(n) память.

## Задача 4. MyLinkedList\<T\>

```csharp
public class MyLinkedList<T>
{
    private class Node
    {
        public T Value;
        public Node? Prev;
        public Node? Next;
        public Node(T value) { Value = value; }
    }

    private Node? _head;
    private Node? _tail;
    private int _count;

    public MyLinkedList() { }

    public MyLinkedList(IEnumerable<T> items)
    {
        if (items == null) throw new ArgumentNullException(nameof(items));
        foreach (var item in items)
            AddLast(item);
    }

    public MyLinkedList(MyLinkedList<T> other) : this(other ?? throw new ArgumentNullException(nameof(other)))
    {
        // копирование через AddLast уже есть в конструкторе от IEnumerable
    }

    public int Count => _count;

    public void AddFirst(T item)
    {
        var node = new Node(item);
        if (_head == null)
            _head = _tail = node;
        else
        {
            node.Next = _head;
            _head.Prev = node;
            _head = node;
        }
        _count++;
    }

    public void AddLast(T item)
    {
        var node = new Node(item);
        if (_tail == null)
            _head = _tail = node;
        else
        {
            node.Prev = _tail;
            _tail.Next = node;
            _tail = node;
        }
        _count++;
    }

    public T RemoveFirst()
    {
        if (_head == null) throw new InvalidOperationException("List is empty");
        T value = _head.Value;
        _head = _head.Next;
        if (_head == null) _tail = null;
        else _head.Prev = null;
        _count--;
        return value;
    }

    public T RemoveLast()
    {
        if (_tail == null) throw new InvalidOperationException("List is empty");
        T value = _tail.Value;
        _tail = _tail.Prev;
        if (_tail == null) _head = null;
        else _tail.Next = null;
        _count--;
        return value;
    }

    public bool Remove(T item)
    {
        var comparer = EqualityComparer<T>.Default;
        var current = _head;
        while (current != null)
        {
            if (comparer.Equals(current.Value, item))
            {
                if (current.Prev == null) _head = current.Next;
                else current.Prev.Next = current.Next;
                if (current.Next == null) _tail = current.Prev;
                else current.Next.Prev = current.Prev;
                _count--;
                return true;
            }
            current = current.Next;
        }
        return false;
    }

    public T? Find(T item)
    {
        var comparer = EqualityComparer<T>.Default;
        var current = _head;
        while (current != null)
        {
            if (comparer.Equals(current.Value, item))
                return current.Value;
            current = current.Next;
        }
        return default;
    }

    public void Clear()
    {
        _head = _tail = null;
        _count = 0;
    }

    public T this[int index]
    {
        get
        {
            if (index < 0 || index >= _count)
                throw new ArgumentOutOfRangeException(nameof(index));
            Node current;
            if (index < _count / 2)
            {
                current = _head!;
                for (int i = 0; i < index; i++) current = current.Next!;
            }
            else
            {
                current = _tail!;
                for (int i = _count - 1; i > index; i--) current = current.Prev!;
            }
            return current.Value;
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyLinkedList<T> other) return false;
        if (_count != other._count) return false;
        var a = _head;
        var b = other._head;
        var comparer = EqualityComparer<T>.Default;
        while (a != null)
        {
            if (!comparer.Equals(a.Value, b!.Value)) return false;
            a = a.Next;
            b = b.Next;
        }
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        var current = _head;
        while (current != null)
        {
            hash = HashCode.Combine(hash, current.Value);
            current = current.Next;
        }
        return hash;
    }

    public override string ToString()
    {
        var parts = new List<string>();
        var current = _head;
        while (current != null)
        {
            parts.Add(current.Value?.ToString() ?? "null");
            current = current.Next;
        }
        return $"MyLinkedList[{string.Join(", ", parts)}]";
    }
}
```

### Объяснение задачи 4. MyLinkedList\<T\>

**Назначение:** Двусвязный список — каждый элемент (Node) хранит ссылки на предыдущий и следующий узлы. Позволяет вставлять и удалять элементы за O(1) в начале/конце.

**Внутренняя структура:**
- `Node` — внутренний класс с полями `Value`, `Prev`, `Next`.
- `_head` — первый узел, `_tail` — последний узел.
- `_count` — количество элементов.

**Конструкторы:**
- `MyLinkedList()` — пустой список.
- `MyLinkedList(IEnumerable<T> items)` — последовательное добавление `AddLast`.
- `MyLinkedList(MyLinkedList<T> other)` — копирование через конструктор от IEnumerable.

**Основные операции:**
- `AddFirst(T item)` / `AddLast(T item)` — создают новый узел и перестраивают связи. Если список пуст, `_head = _tail = new_node`. Иначе — вставка перед `_head` или после `_tail`. O(1).
- `RemoveFirst()` / `RemoveLast()` — удаление с краёв. Обновляют `_head`/`_tail` и обнуляют ссылки у соседнего узла. O(1).
- `Remove(T item)` — линейный поиск элемента и удаление. Перестраивает связи: `prev.Next = current.Next`, `next.Prev = current.Prev`. O(n).
- `Find(T item)` — линейный поиск, возвращает значение первого совпадения или `default`. O(n).
- `Clear()` — обнуляет голову и хвост.
- `this[int index]` — доступ по индексу. Оптимизация: если `index < _count/2`, идём от головы; иначе — от хвоста. O(n).

**Особенности:**
- Двусвязность позволяет удалять узел за O(1), имея на него ссылку (по сравнению с односвязным списком).
- `Remove` корректно обрабатывает удаление головы, хвоста и единственного узла.
- `ToString` выводит элементы через запятую: `MyLinkedList[item1, item2, ...]`.

**Сложность:** Вставка/удаление на краях — O(1); доступ по индексу — O(n); удаление по значению — O(n); память — O(n).

## Задача 5. MyStack\<T\>

```csharp
public class MyStack<T>
{
    private T[] _items;
    private int _count;

    public MyStack() : this(4) { }

    public MyStack(int capacity)
    {
        if (capacity < 0) throw new ArgumentException("Capacity cannot be negative");
        _items = new T[capacity];
        _count = 0;
    }

    public MyStack(IEnumerable<T> items)
    {
        if (items == null) throw new ArgumentNullException(nameof(items));
        _items = items.ToArray();
        _count = _items.Length;
    }

    public int Count => _count;
    public bool IsEmpty => _count == 0;

    public void Push(T item)
    {
        if (_count == _items.Length)
            Array.Resize(ref _items, _items.Length * 2);
        _items[_count++] = item;
    }

    public T Pop()
    {
        if (_count == 0) throw new InvalidOperationException("Stack is empty");
        T value = _items[--_count];
        _items[_count] = default!;
        return value;
    }

    public T Peek()
    {
        if (_count == 0) throw new InvalidOperationException("Stack is empty");
        return _items[_count - 1];
    }

    public bool TryPop(out T value)
    {
        if (_count == 0) { value = default!; return false; }
        value = Pop();
        return true;
    }

    public void Clear()
    {
        Array.Clear(_items, 0, _count);
        _count = 0;
    }

    public T this[int indexFromTop]
    {
        get
        {
            if (indexFromTop < 0 || indexFromTop >= _count)
                throw new ArgumentOutOfRangeException(nameof(indexFromTop));
            return _items[_count - 1 - indexFromTop];
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyStack<T> other) return false;
        if (_count != other._count) return false;
        var comparer = EqualityComparer<T>.Default;
        for (int i = 0; i < _count; i++)
            if (!comparer.Equals(_items[_count - 1 - i], other._items[other._count - 1 - i]))
                return false;
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        for (int i = _count - 1; i >= 0; i--)
            hash = HashCode.Combine(hash, _items[i]);
        return hash;
    }

    public override string ToString()
    {
        var parts = new List<string>();
        for (int i = _count - 1; i >= 0; i--)
            parts.Add(_items[i]?.ToString() ?? "null");
        return $"Top -> {string.Join(", ", parts)}";
    }
}
```

### Объяснение задачи 5. MyStack\<T\>

**Назначение:** Стек — структура LIFO (Last In, First Out). Реализован на динамическом массиве. Предоставляет операции Push (положить сверху), Pop (снять сверху), Peek (посмотреть верхний).

**Хранение данных:**
- `_items` (`T[]`) — массив элементов.
- `_count` — количество элементов. Вершина стека — `_items[_count - 1]`.

**Конструкторы:**
- `MyStack()` — буфер на 4 элемента.
- `MyStack(int capacity)` — буфер заданной ёмкости.
- `MyStack(IEnumerable<T> items)` — из коллекции (элементы располагаются так, чтобы последний был на вершине).

**Основные операции:**
- `Push(T item)` — вставляет на вершину. При переполнении массив удваивается (амортизированно O(1)).
- `Pop()` — возвращает верхний элемент и удаляет его. Обнуляет освобождённую позицию (`_items[_count] = default`) для сборщика мусора. O(1).
- `Peek()` — возвращает верхний элемент без удаления. O(1).
- `TryPop(out T value)` — безопасная версия Pop без исключения.
- `Clear()` — зануляет все позиции.

**Индексатор:** `this[int indexFromTop]` — доступ к элементу по глубине от вершины. `this[0]` — вершина, `this[1]` — второй сверху и т.д.

**Equals/ToString:**
- `Equals` — сравнение от вершины к основанию.
- `ToString` — вывод от вершины: `Top -> item1, item2, ...`.

**Сложность:** Все операции O(1). Память — O(n).

## Задача 6. MyCircularQueue\<T\>

```csharp
public class MyCircularQueue<T>
{
    private T[] _items;
    private int _head;
    private int _tail; // tail указывает на следующую свободную позицию
    private int _count;
    private int _capacity;

    public MyCircularQueue() : this(4) { }

    public MyCircularQueue(int capacity)
    {
        if (capacity <= 0) throw new ArgumentException("Capacity must be positive");
        _items = new T[capacity];
        _capacity = capacity;
        _head = 0;
        _tail = 0;
        _count = 0;
    }

    public MyCircularQueue(IEnumerable<T> items) : this(4)
    {
        if (items == null) throw new ArgumentNullException(nameof(items));
        foreach (var item in items)
            Enqueue(item);
    }

    public int Count => _count;
    public int Capacity => _capacity;

    public void Enqueue(T item)
    {
        if (_count == _capacity)
        {
            // расширение
            var newItems = new T[_capacity * 2];
            for (int i = 0; i < _count; i++)
                newItems[i] = _items[(_head + i) % _capacity];
            _items = newItems;
            _head = 0;
            _tail = _count;
            _capacity *= 2;
        }
        _items[_tail] = item;
        _tail = (_tail + 1) % _capacity;
        _count++;
    }

    public T Dequeue()
    {
        if (_count == 0) throw new InvalidOperationException("Queue is empty");
        T value = _items[_head];
        _items[_head] = default!;
        _head = (_head + 1) % _capacity;
        _count--;
        return value;
    }

    public T Peek()
    {
        if (_count == 0) throw new InvalidOperationException("Queue is empty");
        return _items[_head];
    }

    public bool TryDequeue(out T value)
    {
        if (_count == 0) { value = default!; return false; }
        value = Dequeue();
        return true;
    }

    public void Clear()
    {
        for (int i = 0; i < _count; i++)
            _items[(_head + i) % _capacity] = default!;
        _head = _tail = 0;
        _count = 0;
    }

    public T this[int position]
    {
        get
        {
            if (position < 0 || position >= _count)
                throw new ArgumentOutOfRangeException(nameof(position));
            return _items[(_head + position) % _capacity];
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyCircularQueue<T> other) return false;
        if (_count != other._count) return false;
        var comparer = EqualityComparer<T>.Default;
        for (int i = 0; i < _count; i++)
            if (!comparer.Equals(this[i], other[i]))
                return false;
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        for (int i = 0; i < _count; i++)
            hash = HashCode.Combine(hash, this[i]);
        return hash;
    }

    public override string ToString()
    {
        var parts = new List<string>();
        for (int i = 0; i < _count; i++)
            parts.Add(this[i]?.ToString() ?? "null");
        return $"Front -> {string.Join(", ", parts)} <- Back";
    }
}
```

### Объяснение задачи 6. MyCircularQueue\<T\>

**Назначение:** Циклическая очередь — структура FIFO (First In, First Out), где свободное место в начале массива повторно используется. В отличие от обычной очереди на массиве, не требует сдвига элементов.

**Хранение данных:**
- `_items` (`T[]`) — кольцевой буфер.
- `_head` — индекс первого элемента (откуда извлекаем).
- `_tail` — индекс следующей свободной позиции (куда вставляем).
- `_count` — количество элементов, `_capacity` — размер буфера.

**Ключевая идея:** Индексы перемещаются по кольцу с помощью `% _capacity`. Когда `_tail == _head` и `_count > 0` — очередь полна; когда `_tail == _head` и `_count == 0` — пуста.

**Основные операции:**
- `Enqueue(T item)` — вставляет по `_tail`, затем `_tail = (_tail + 1) % _capacity`. Если очередь заполнена, создаётся новый массив вдвое больше, элементы копируются в линейном порядке. O(1) амортизированно.
- `Dequeue()` — берёт по `_head`, зануляет ячейку, `_head = (_head + 1) % _capacity`. O(1).
- `Peek()` — читает `_items[_head]` без удаления. O(1).
- `TryDequeue(out T value)` — безопасное извлечение.
- `Clear()` — зануляет все занятые ячейки по кольцу, сбрасывает индексы.
- `this[int position]` — доступ по позиции от головы: `_items[(_head + position) % _capacity]`.

**Расширение:** При переполнении копирует элементы в новый массив без «кольца» — `_head` становится 0, `_tail = _count`. Это позволяет избежать фрагментации индексов после многих resize'ов.

**Сложность:** Enqueue/Dequeue — O(1) амортизированно; доступ по позиции — O(1); память — O(capacity).

## Задача 7. MyPriorityQueue\<T\>

```csharp
public class MyPriorityQueue<T>
{
    private readonly List<T> _heap;
    private readonly IComparer<T> _comparer;

    public MyPriorityQueue() : this(Comparer<T>.Default) { }

    public MyPriorityQueue(IComparer<T> comparer)
    {
        _heap = new List<T>();
        _comparer = comparer ?? Comparer<T>.Default;
    }

    public MyPriorityQueue(IEnumerable<T> items, IComparer<T>? comparer = null)
        : this(comparer ?? Comparer<T>.Default)
    {
        if (items != null)
        {
            _heap.AddRange(items);
            BuildHeap();
        }
    }

    public int Count => _heap.Count;

    public void Enqueue(T item)
    {
        _heap.Add(item);
        int i = _heap.Count - 1;
        while (i > 0)
        {
            int parent = (i - 1) / 2;
            if (_comparer.Compare(_heap[parent], _heap[i]) <= 0) break;
            Swap(parent, i);
            i = parent;
        }
    }

    public T Dequeue()
    {
        if (_heap.Count == 0) throw new InvalidOperationException("Queue is empty");
        T result = _heap[0];
        _heap[0] = _heap[^1];
        _heap.RemoveAt(_heap.Count - 1);
        if (_heap.Count > 0) SiftDown(0);
        return result;
    }

    public T Peek()
    {
        if (_heap.Count == 0) throw new InvalidOperationException("Queue is empty");
        return _heap[0];
    }

    public void Clear() => _heap.Clear();

    public void BuildHeap(IEnumerable<T> items)
    {
        _heap.Clear();
        _heap.AddRange(items);
        BuildHeap();
    }

    private void BuildHeap()
    {
        for (int i = _heap.Count / 2 - 1; i >= 0; i--)
            SiftDown(i);
    }

    private void SiftDown(int i)
    {
        int n = _heap.Count;
        while (true)
        {
            int smallest = i;
            int left = 2 * i + 1;
            int right = 2 * i + 2;
            if (left < n && _comparer.Compare(_heap[left], _heap[smallest]) < 0)
                smallest = left;
            if (right < n && _comparer.Compare(_heap[right], _heap[smallest]) < 0)
                smallest = right;
            if (smallest == i) break;
            Swap(i, smallest);
            i = smallest;
        }
    }

    private void Swap(int i, int j)
    {
        (T temp, _heap[i], _heap[j]) = (_heap[i], _heap[j], _heap[i]);
    }

    public T this[int heapIndex]
    {
        get
        {
            if (heapIndex < 0 || heapIndex >= _heap.Count)
                throw new ArgumentOutOfRangeException(nameof(heapIndex));
            return _heap[heapIndex];
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyPriorityQueue<T> other) return false;
        if (_count != other._count) return false;
        // сравниваем логические извлечения
        var copy1 = new MyPriorityQueue<T>(_heap, _comparer);
        var copy2 = new MyPriorityQueue<T>(other._heap, other._comparer);
        var comparer = EqualityComparer<T>.Default;
        while (copy1.Count > 0)
            if (!comparer.Equals(copy1.Dequeue(), copy2.Dequeue()))
                return false;
        return true;
    }

    // GetHashCode — по логическому порядку извлечения
    public override int GetHashCode()
    {
        var copy = new MyPriorityQueue<T>(_heap, _comparer);
        int hash = 17;
        while (copy.Count > 0)
            hash = HashCode.Combine(hash, copy.Dequeue());
        return hash;
    }

    public override string ToString()
    {
        T? next = _heap.Count > 0 ? _heap[0] : default;
        return $"MyPriorityQueue(count={_heap.Count}; next={next})";
    }
}
```

### Объяснение задачи 7. MyPriorityQueue\<T\>

**Назначение:** Очередь с приоритетом, реализованная через **бинарную кучу (heap)**. Элемент с наименьшим ключом (согласно `IComparer<T>`) всегда находится на вершине. Извлечение минимального элемента — O(log n).

**Хранение данных:**
- `_heap` (`List<T>`) — массив, где `_heap[0]` — корень (минимальный элемент). Для узла с индексом i: левый потомок — `2i+1`, правый — `2i+2`, родитель — `(i-1)/2`.
- `_comparer` — компаратор для сравнения приоритетов.

**Построение кучи (BuildHeap):**
- Из произвольного массива куча строится за O(n): `SiftDown` вызывается для всех узлов, начиная с последнего родителя `(n/2 - 1)` вниз до корня.

**Основные операции:**
- `Enqueue(T item)` — добавляет в конец списка, затем «всплывает» (SiftUp): меняется местами с родителем, пока свойство кучи не восстановлено. O(log n).
- `Dequeue()` — извлекает корень, помещает последний элемент на вершину и «топит» (SiftDown) его вниз, выбирая меньшего из потомков. O(log n).
- `Peek()` — возвращает `_heap[0]` (минимум). O(1).
- `SiftDown(int i)` — сравнение с левым и правым потомком, обмен с наименьшим, рекурсивное продолжение. O(log n).

**Equals/GetHashCode/ToString:**
- `Equals` — сравнивает «логическое» содержимое, последовательно извлекая элементы из копий очередей. Это корректно, так как порядок извлечения — единственный значимый порядок.
- `GetHashCode` аналогично: деqueue всей копии.
- `ToString` — показывает `count` и вершину (следующий к извлечению).

**Сложность:** Enqueue/Dequeue — O(log n); BuildHeap — O(n); Peek — O(1); память — O(n).

## Задача 8. MyHashMap\<TKey, TValue\>

```csharp
public class MyHashMap<TKey, TValue>
{
    private struct Entry
    {
        public TKey Key;
        public TValue Value;
        public int Next; // индекс следующего в цепочке, -1 если конец
    }

    private Entry[] _entries;
    private int[] _buckets;
    private int _count;
    private int _freeList;
    private int _freeCount;
    private readonly double _loadFactor;
    private readonly IEqualityComparer<TKey> _comparer;

    public MyHashMap() : this(4, 0.75) { }

    public MyHashMap(int initialCapacity) : this(initialCapacity, 0.75) { }

    public MyHashMap(int initialCapacity, double loadFactor)
    {
        if (initialCapacity <= 0) throw new ArgumentException("Capacity must be positive");
        if (loadFactor <= 0 || loadFactor > 1) throw new ArgumentException("Invalid load factor");
        int size = NextPowerOf2(initialCapacity);
        _buckets = new int[size];
        Array.Fill(_buckets, -1);
        _entries = new Entry[size];
        _freeList = -1;
        _freeCount = 0;
        _loadFactor = loadFactor;
        _comparer = EqualityComparer<TKey>.Default;
    }

    public int Count => _count - _freeCount;

    private static int NextPowerOf2(int n)
    {
        int p = 1;
        while (p < n) p <<= 1;
        return p;
    }

    private int GetBucket(TKey key) => (_comparer.GetHashCode(key) & 0x7FFFFFFF) % _buckets.Length;

    public void Put(TKey key, TValue value)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        int bucket = GetBucket(key);
        for (int i = _buckets[bucket]; i != -1; i = _entries[i].Next)
        {
            if (_comparer.Equals(_entries[i].Key, key))
            {
                _entries[i].Value = value;
                return;
            }
        }
        // добавляем новый
        if (_count == _entries.Length)
            Resize();
        bucket = GetBucket(key);
        int index;
        if (_freeCount > 0)
        {
            index = _freeList;
            _freeList = _entries[index].Next;
            _freeCount--;
        }
        else
        {
            index = _count++;
        }
        _entries[index] = new Entry { Key = key, Value = value, Next = _buckets[bucket] };
        _buckets[bucket] = index;
    }

    public bool TryGetValue(TKey key, out TValue value)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        int bucket = GetBucket(key);
        for (int i = _buckets[bucket]; i != -1; i = _entries[i].Next)
        {
            if (_comparer.Equals(_entries[i].Key, key))
            {
                value = _entries[i].Value;
                return true;
            }
        }
        value = default!;
        return false;
    }

    public bool Remove(TKey key)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        int bucket = GetBucket(key);
        int prev = -1;
        for (int i = _buckets[bucket]; i != -1; i = _entries[i].Next)
        {
            if (_comparer.Equals(_entries[i].Key, key))
            {
                if (prev == -1)
                    _buckets[bucket] = _entries[i].Next;
                else
                    _entries[prev].Next = _entries[i].Next;
                _entries[i].Next = _freeList;
                _freeList = i;
                _freeCount++;
                _entries[i].Key = default!;
                _entries[i].Value = default!;
                return true;
            }
            prev = i;
        }
        return false;
    }

    public bool ContainsKey(TKey key) => TryGetValue(key, out _);

    public void Clear()
    {
        Array.Fill(_buckets, -1);
        Array.Clear(_entries, 0, _count);
        _count = 0;
        _freeList = -1;
        _freeCount = 0;
    }

    public IEnumerable<TKey> Keys()
    {
        for (int i = 0; i < _count; i++)
            if (_entries[i].Next >= -1 && _entries[i].Key != null)
                yield return _entries[i].Key;
    }

    public IEnumerable<TValue> Values()
    {
        for (int i = 0; i < _count; i++)
            if (_entries[i].Next >= -1 && _entries[i].Key != null)
                yield return _entries[i].Value;
    }

    public TValue this[TKey key]
    {
        get
        {
            if (TryGetValue(key, out var value)) return value;
            throw new KeyNotFoundException();
        }
        set => Put(key, value);
    }

    private void Resize()
    {
        int newSize = _entries.Length * 2;
        var newBuckets = new int[newSize];
        Array.Fill(newBuckets, -1);
        var newEntries = new Entry[newSize];
        Array.Copy(_entries, newEntries, _count);
        for (int i = 0; i < _count; i++)
        {
            if (newEntries[i].Next >= -1 && newEntries[i].Key != null)
            {
                int bucket = (_comparer.GetHashCode(newEntries[i].Key) & 0x7FFFFFFF) % newSize;
                newEntries[i].Next = newBuckets[bucket];
                newBuckets[bucket] = i;
            }
        }
        _buckets = newBuckets;
        _entries = newEntries;
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyHashMap<TKey, TValue> other) return false;
        if (Count != other.Count) return false;
        foreach (var key in Keys())
        {
            if (!other.TryGetValue(key, out var val)) return false;
            if (!EqualityComparer<TValue>.Default.Equals(this[key], val)) return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 0;
        foreach (var key in Keys())
        {
            int pairHash = HashCode.Combine(key, this[key]);
            hash ^= pairHash;
        }
        return hash;
    }

    public override string ToString()
    {
        var parts = new List<string>();
        foreach (var key in Keys())
            parts.Add($"{key}={this[key]}");
        return $"{{{string.Join(", ", parts)}}}";
    }
}
```

### Объяснение задачи 8. MyHashMap\<TKey, TValue\>

**Назначение:** Хеш-таблица с **методом цепочек** (closed addressing). Хранит пары ключ-значение. Ключи хешируются, хеш определяет номер корзины (bucket), внутри которой элементы связаны в односвязный список. Реализация близка к `Dictionary<TKey, TValue>` из .NET.

**Хранение данных:**
- `_buckets` (`int[]`) — массив «голов» списков: `_buckets[b]` = индекс первого элемента цепочки для корзины b (или -1, если пусто).
- `_entries` (`Entry[]`) — единый массив записей. Каждая `Entry` содержит `Key`, `Value` и `Next` (индекс следующего элемента в цепочке). Такой подход (flat array вместо отдельных Node) улучшает локальность данных.
- `_freeList`, `_freeCount` — список освобождённых позиций для повторного использования (`Remove` помещает удалённые записи в free list).
- `_loadFactor` — коэффициент заполнения (по умолчанию 0.75), при превышении — resize.
- `_comparer` — `IEqualityComparer<TKey>` для вычисления хеша и сравнения ключей.

**Конструктор:** Инициализирует размер до ближайшей степени двойки от `initialCapacity`. Выравнивание на степень двойки позволяет эффективно брать остаток от деления через `& (size - 1)` (хотя здесь используется `%`).

**Основные операции:**
- `Put(TKey key, TValue value)`:
  1. Вычисляет bucket через `GetBucket(key)`.
  2. Проходит по цепочке — если ключ найден, обновляет значение.
  3. Иначе — при необходимости Resize, затем вставка: сначала проверяет free list, иначе использует `_count++`.
  4. Вставляет запись, `Next = _buckets[bucket]` (вставка в начало цепочки).
- `TryGetValue(TKey key, out TValue)` — проходит цепочку, сравнивая ключи через `_comparer.Equals`. O(1) в среднем.
- `Remove(TKey key)` — удаляет из цепочки, корректируя ссылку prev.Next. Освобождённый индекс добавляется в free list.
- `ContainsKey` — обёртка над `TryGetValue`.
- `Clear()` — зануляет buckets и entries, сбрасывает счётчики.
- `Keys()` / `Values()` — проход по всем занятым записям (проверка `Next >= -1 && Key != null`).
- `Resize()` — удваивает размер, создаёт новые buckets, перехеширует все существующие записи.

**Сложность:** Вставка/поиск/удаление — O(1) в среднем (амортизированно), O(n) в худшем (коллизии). Память — O(capacity + count).

## Задача 9. MyTreeMap\<TKey, TValue\>

```csharp
public class MyTreeMap<TKey, TValue>
{
    private class Node
    {
        public TKey Key;
        public TValue Value;
        public Node? Left;
        public Node? Right;
        public Node(TKey key, TValue value) { Key = key; Value = value; }
    }

    private Node? _root;
    private int _count;
    private readonly IComparer<TKey> _comparer;

    public MyTreeMap() : this(Comparer<TKey>.Default) { }

    public MyTreeMap(IComparer<TKey> comparer)
    {
        _comparer = comparer ?? Comparer<TKey>.Default;
    }

    public MyTreeMap(IEnumerable<KeyValuePair<TKey, TValue>> items) : this()
    {
        if (items == null) throw new ArgumentNullException(nameof(items));
        foreach (var kv in items)
            Put(kv.Key, kv.Value);
    }

    public int Count => _count;

    public void Put(TKey key, TValue value)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        _root = Put(_root, key, value);
    }

    private Node Put(Node? node, TKey key, TValue value)
    {
        if (node == null) { _count++; return new Node(key, value); }
        int cmp = _comparer.Compare(key, node.Key);
        if (cmp < 0) node.Left = Put(node.Left, key, value);
        else if (cmp > 0) node.Right = Put(node.Right, key, value);
        else node.Value = value;
        return node;
    }

    public bool TryGetValue(TKey key, out TValue value)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        var node = Find(key);
        if (node != null) { value = node.Value; return true; }
        value = default!;
        return false;
    }

    private Node? Find(TKey key)
    {
        var cur = _root;
        while (cur != null)
        {
            int cmp = _comparer.Compare(key, cur.Key);
            if (cmp < 0) cur = cur.Left;
            else if (cmp > 0) cur = cur.Right;
            else return cur;
        }
        return null;
    }

    public bool Remove(TKey key)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        int oldCount = _count;
        _root = Remove(_root, key);
        return _count < oldCount;
    }

    private Node? Remove(Node? node, TKey key)
    {
        if (node == null) return null;
        int cmp = _comparer.Compare(key, node.Key);
        if (cmp < 0) node.Left = Remove(node.Left, key);
        else if (cmp > 0) node.Right = Remove(node.Right, key);
        else
        {
            _count--;
            if (node.Left == null) return node.Right;
            if (node.Right == null) return node.Left;
            // два потомка: находим минимум в правом поддереве
            var min = FindMin(node.Right);
            node.Key = min.Key;
            node.Value = min.Value;
            node.Right = Remove(node.Right, min.Key);
            _count++; // Remove уменьшил, возвращаем
        }
        return node;
    }

    private static Node FindMin(Node node)
    {
        while (node.Left != null) node = node.Left;
        return node;
    }

    public bool ContainsKey(TKey key) => Find(key) != null;

    public TKey MinKey()
    {
        if (_root == null) throw new InvalidOperationException("Map is empty");
        return FindMin(_root).Key;
    }

    public TKey MaxKey()
    {
        if (_root == null) throw new InvalidOperationException("Map is empty");
        var cur = _root;
        while (cur.Right != null) cur = cur.Right;
        return cur.Key;
    }

    public IEnumerable<KeyValuePair<TKey, TValue>> InOrder()
    {
        return InOrder(_root);
    }

    private static IEnumerable<KeyValuePair<TKey, TValue>> InOrder(Node? node)
    {
        if (node == null) yield break;
        foreach (var kv in InOrder(node.Left)) yield return kv;
        yield return new KeyValuePair<TKey, TValue>(node.Key, node.Value);
        foreach (var kv in InOrder(node.Right)) yield return kv;
    }

    public IEnumerable<KeyValuePair<TKey, TValue>> Range(TKey from, TKey to)
    {
        return InOrder(_root).Where(kv =>
            _comparer.Compare(kv.Key, from) >= 0 &&
            _comparer.Compare(kv.Key, to) <= 0);
    }

    public void Clear() { _root = null; _count = 0; }

    public TValue this[TKey key]
    {
        get
        {
            if (TryGetValue(key, out var value)) return value;
            throw new KeyNotFoundException();
        }
        set => Put(key, value);
    }

    public override bool Equals(object? obj)
    {
        if (obj is not MyTreeMap<TKey, TValue> other) return false;
        if (Count != other.Count) return false;
        // сравниваем как отображения (форма дерева не влияет)
        using var e1 = InOrder().GetEnumerator();
        using var e2 = other.InOrder().GetEnumerator();
        var keyComparer = EqualityComparer<TKey>.Default;
        var valComparer = EqualityComparer<TValue>.Default;
        while (e1.MoveNext() && e2.MoveNext())
        {
            if (!keyComparer.Equals(e1.Current.Key, e2.Current.Key) ||
                !valComparer.Equals(e1.Current.Value, e2.Current.Value))
                return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        foreach (var kv in InOrder())
            hash = HashCode.Combine(hash, kv.Key, kv.Value);
        return hash;
    }

    public override string ToString()
    {
        var parts = InOrder().Select(kv => $"{kv.Key}={kv.Value}");
        return $"{{{string.Join(", ", parts)}}}";
    }
}
```

### Объяснение задачи 9. MyTreeMap\<TKey, TValue\>

**Назначение:** Отображение «ключ-значение» на основе **бинарного дерева поиска (BST)**. Все ключи хранятся в отсортированном порядке согласно `IComparer<TKey>`. Поддерживает обход in-order, поиск по диапазону, min/max ключи.

**Хранение данных:**
- `_root` — корневой узел дерева.
- Каждый `Node` содержит `Key`, `Value`, `Left`, `Right`.
- `_comparer` — `IComparer<TKey>` для сравнения ключей (по умолчанию — `Comparer<TKey>.Default`).

**Основные операции:**
- `Put(TKey key, TValue value)` — рекурсивный спуск: если ключ меньше — идём влево, больше — вправо, равен — обновляем значение. При null создаём новый узел и увеличиваем `_count`.
- `Find(TKey key)` — итеративный спуск по дереву с сравнением. O(h), где h — высота дерева.
- `TryGetValue` / `ContainsKey` — обёртки над `Find`.
- `Remove(TKey key)` — три случая:
  1. Лист — просто убираем.
  2. Один потомок — заменяем удаляемый узел на потомка.
  3. Два потомка — находим **минимальный** узел в правом поддереве (`FindMin`), копируем его ключ/значение в удаляемый узел, рекурсивно удаляем минимальный из правого поддерева.
- `MinKey()` / `MaxKey()` — идём до упора влево/вправо от корня.
- `InOrder()` — рекурсивный обход: левое поддерево → узел → правое поддерево. Возвращает пары в порядке возрастания ключей.
- `Range(TKey from, TKey to)` — обход InOrder с фильтрацией по диапазону.

**Особенности:**
- Дерево **не сбалансировано** (в отличие от `SortedDictionary`, использующего красно-черное дерево). В худшем случае (вставка отсортированных ключей) вырождается в линейный список.
- `Equals` — сравнивает как отображения: обход in-order обеих структур, независимо от формы дерева.
- `ToString` — вывод в формате `{key1=value1, key2=value2, ...}`.

**Сложность:** Поиск/вставка/удаление — O(h), где h = O(n) в худшем, O(log n) в среднем при случайных данных. InOrder — O(n). Память — O(n).

## Задача 10. AdjacencyListGraph\<TVertex\>

```csharp
public class AdjacencyListGraph<TVertex> where TVertex : notnull
{
    private readonly Dictionary<TVertex, HashSet<TVertex>> _adj;
    private readonly bool _directed;

    public AdjacencyListGraph(bool directed = false)
    {
        _adj = new Dictionary<TVertex, HashSet<TVertex>>();
        _directed = directed;
    }

    public AdjacencyListGraph(IEnumerable<TVertex> vertices, bool directed = false) : this(directed)
    {
        if (vertices == null) throw new ArgumentNullException(nameof(vertices));
        foreach (var v in vertices)
            AddVertex(v);
    }

    public int VertexCount => _adj.Count;
    public int EdgeCount
    {
        get
        {
            int count = _adj.Sum(kv => kv.Value.Count);
            return _directed ? count : count / 2;
        }
    }

    public void AddVertex(TVertex vertex)
    {
        if (vertex == null) throw new ArgumentNullException(nameof(vertex));
        if (!_adj.ContainsKey(vertex))
            _adj[vertex] = new HashSet<TVertex>();
    }

    public void AddEdge(TVertex u, TVertex v)
    {
        if (u == null) throw new ArgumentNullException(nameof(u));
        if (v == null) throw new ArgumentNullException(nameof(v));
        AddVertex(u);
        AddVertex(v);
        _adj[u].Add(v);
        if (!_directed)
            _adj[v].Add(u);
    }

    public void RemoveVertex(TVertex vertex)
    {
        if (vertex == null) throw new ArgumentNullException(nameof(vertex));
        if (!_adj.ContainsKey(vertex)) return;
        if (!_directed)
            foreach (var neighbor in _adj[vertex])
                _adj[neighbor].Remove(vertex);
        else
            foreach (var kv in _adj)
                kv.Value.Remove(vertex);
        _adj.Remove(vertex);
    }

    public void RemoveEdge(TVertex u, TVertex v)
    {
        if (u == null || v == null) throw new ArgumentNullException();
        if (_adj.TryGetValue(u, out var set))
            set.Remove(v);
        if (!_directed && _adj.TryGetValue(v, out var set2))
            set2.Remove(u);
    }

    public bool ContainsVertex(TVertex vertex)
        => vertex != null && _adj.ContainsKey(vertex);

    public IEnumerable<TVertex> Neighbors(TVertex vertex)
    {
        if (vertex == null) throw new ArgumentNullException(nameof(vertex));
        if (!_adj.TryGetValue(vertex, out var set))
            throw new KeyNotFoundException();
        return set;
    }

    public int Degree(TVertex vertex)
    {
        if (vertex == null) throw new ArgumentNullException(nameof(vertex));
        if (!_adj.TryGetValue(vertex, out var set))
            throw new KeyNotFoundException();
        return set.Count;
    }

    public IEnumerable<TVertex> BFS(TVertex start)
    {
        if (start == null) throw new ArgumentNullException(nameof(start));
        var visited = new HashSet<TVertex>();
        var queue = new Queue<TVertex>();
        visited.Add(start);
        queue.Enqueue(start);
        while (queue.Count > 0)
        {
            var v = queue.Dequeue();
            yield return v;
            foreach (var n in _adj[v])
                if (visited.Add(n))
                    queue.Enqueue(n);
        }
    }

    public IEnumerable<TVertex> DFS(TVertex start)
    {
        if (start == null) throw new ArgumentNullException(nameof(start));
        var visited = new HashSet<TVertex>();
        var stack = new Stack<TVertex>();
        stack.Push(start);
        while (stack.Count > 0)
        {
            var v = stack.Pop();
            if (!visited.Add(v)) continue;
            yield return v;
            foreach (var n in _adj[v])
                if (!visited.Contains(n))
                    stack.Push(n);
        }
    }

    public void Clear() => _adj.Clear();

    public IEnumerable<TVertex> this[TVertex vertex]
    {
        get
        {
            if (!_adj.TryGetValue(vertex, out var set))
                throw new KeyNotFoundException();
            return set;
        }
    }

    public override bool Equals(object? obj)
    {
        if (obj is not AdjacencyListGraph<TVertex> other) return false;
        if (VertexCount != other.VertexCount || EdgeCount != other.EdgeCount)
            return false;
        foreach (var (v, neighbors) in _adj)
        {
            if (!other._adj.TryGetValue(v, out var otherNeighbors))
                return false;
            if (!neighbors.SetEquals(otherNeighbors))
                return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        int hash = 17;
        foreach (var (v, neighbors) in _adj)
        {
            int vertexHash = v.GetHashCode();
            int edgeHash = 0;
            foreach (var n in neighbors)
            {
                if (_directed)
                    edgeHash ^= HashCode.Combine(v, n);
                else
                {
                    var (a, b) = _comparer.Compare(v, n) < 0 ? (v, n) : (n, v);
                    edgeHash ^= HashCode.Combine(a, b);
                }
            }
            hash = HashCode.Combine(hash, vertexHash, edgeHash);
        }
        return hash;
    }

    private static readonly Comparer<object> _comparer = Comparer<object>.Default;

    public override string ToString()
    {
        var lines = new List<string>();
        foreach (var v in _adj.Keys.OrderBy(k => k.ToString()))
            lines.Add($"{v}: {string.Join(", ", _adj[v].OrderBy(n => n.ToString()))}");
        return string.Join("\n", lines);
    }
}
```

# Задачи на алгоритмы

## Задача 1. Антиплагиат аннотаций: полиномиальные хеши
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

public class PolyHash
{
    private readonly long[] _pref;
    private readonly long[] _powb;
    private readonly long _mod;
    private readonly long _base;

    public PolyHash(string s, long b = 911, long mod = 1_000_000_007L)
    {
        _base = b;
        _mod = mod;
        int n = s.Length;
        _pref = new long[n + 1];
        _powb = new long[n + 1];
        _powb[0] = 1;
        for (int i = 0; i < n; i++)
        {
            _pref[i + 1] = (_pref[i] * _base + s[i]) % _mod;
            _powb[i + 1] = (_powb[i] * _base) % _mod;
        }
    }

    public long GetHash(int l, int r)
    {
        return ((_pref[r] - _pref[l] * _powb[r - l]) % _mod + _mod) % _mod;
    }
}

public static class Plagiarism
{
    private static string Normalize(string s)
    {
        s = s.ToLower();
        s = Regex.Replace(s, @"[^\w\s]", "");
        s = Regex.Replace(s, @"\s+", " ").Trim();
        return s;
    }

    public static List<(int, int, string)> FindPlagiarism(List<string> annotations, int L)
    {
        var normed = annotations.Select(Normalize).ToList();
        int n = normed.Count;

        var annHashes1 = new List<HashSet<long>>();
        var annHashes2 = new List<HashSet<long>>();

        foreach (var s in normed)
        {
            if (s.Length < L)
            {
                annHashes1.Add(new HashSet<long>());
                annHashes2.Add(new HashSet<long>());
                continue;
            }
            var ph1 = new PolyHash(s, 911, 1_000_000_007L);
            var ph2 = new PolyHash(s, 131, 1_000_000_009L);
            var hs1 = new HashSet<long>();
            var hs2 = new HashSet<long>();
            for (int i = 0; i <= s.Length - L; i++)
            {
                hs1.Add(ph1.GetHash(i, i + L));
                hs2.Add(ph2.GetHash(i, i + L));
            }
            annHashes1.Add(hs1);
            annHashes2.Add(hs2);
        }

        var results = new List<(int, int, string)>();
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (!annHashes1[i].Overlaps(annHashes1[j])) continue;

                for (int start = 0; start <= normed[i].Length - L; start++)
                {
                    string frag = normed[i].Substring(start, L);
                    if (normed[j].Contains(frag))
                    {
                        results.Add((i, j, frag));
                        break;
                    }
                }
            }
        }
        return results;
    }
}
```

## Задача 2. Поиск шаблона в тексте: префикс-функция и КМП
```csharp
public static class KMP
{
    public static int[] PrefixFunction(string pattern)
    {
        int m = pattern.Length;
        var pi = new int[m];
        for (int i = 1; i < m; i++)
        {
            int j = pi[i - 1];
            while (j > 0 && pattern[i] != pattern[j])
                j = pi[j - 1];
            if (pattern[i] == pattern[j])
                j++;
            pi[i] = j;
        }
        return pi;
    }

    public static List<int> Search(string text, string pattern)
    {
        int n = text.Length, m = pattern.Length;
        var positions = new List<int>();
        if (m == 0) return positions;

        var pi = PrefixFunction(pattern);
        int matched = 0;
        for (int i = 0; i < n; i++)
        {
            while (matched > 0 && text[i] != pattern[matched])
                matched = pi[matched - 1];
            if (text[i] == pattern[matched])
                matched++;
            if (matched == m)
            {
                positions.Add(i - m + 1);
                matched = pi[matched - 1];
            }
        }
        return positions;
    }
}
```

## Задача 3. Префиксные совпадения: Z-функция
```csharp
public static class ZFunc
{
    public static int[] ZFunction(string s)
    {
        int n = s.Length;
        var z = new int[n];
        int l = 0, r = 0;
        for (int i = 1; i < n; i++)
        {
            if (i <= r)
                z[i] = Math.Min(r - i + 1, z[i - l]);
            while (i + z[i] < n && s[z[i]] == s[i + z[i]])
                z[i]++;
            if (i + z[i] - 1 > r)
            {
                l = i;
                r = i + z[i] - 1;
            }
        }
        return z;
    }

    public static List<int> PrefixSuffixLengths(string s)
    {
        var z = ZFunction(s);
        int n = s.Length;
        var lengths = new List<int>();
        for (int i = 1; i < n; i++)
        {
            if (z[i] == n - i)
                lengths.Add(z[i]);
        }
        lengths.Add(n); // вся строка
        lengths.Sort();
        return lengths;
    }
}
```


## Задача 4. Автодополнение: Бор
```csharp
public class TrieNode
{
    public Dictionary<char, TrieNode> Children = new();
    public bool IsEnd;
}

public class Trie
{
    private readonly TrieNode _root = new();

    public void Insert(string word)
    {
        var node = _root;
        foreach (char ch in word)
        {
            if (!node.Children.ContainsKey(ch))
                node.Children[ch] = new TrieNode();
            node = node.Children[ch];
        }
        node.IsEnd = true;
    }

    private void Dfs(TrieNode node, string prefix, int limit, List<string> result)
    {
        if (result.Count >= limit) return;
        if (node.IsEnd) result.Add(prefix);
        foreach (char ch in node.Children.Keys.OrderBy(c => c))
        {
            if (result.Count >= limit) break;
            Dfs(node.Children[ch], prefix + ch, limit, result);
        }
    }

    public List<string> Autocomplete(string prefix, int k)
    {
        var node = _root;
        foreach (char ch in prefix)
        {
            if (!node.Children.ContainsKey(ch)) return new List<string>();
            node = node.Children[ch];
        }
        var result = new List<string>();
        Dfs(node, prefix, k, result);
        return result;
    }
}
```

## Задача 5. Фильтр материалов: Ахо-Корасик
```csharp
public class AhoCorasick
{
    private class AcNode
    {
        public int[] Next = new int[128];
        public int Fail;
        public List<int> Output = new();
        public int Dict; // ближайший предок (по fail) с непустым Output

        public AcNode() { Array.Fill(Next, -1); Dict = -1; }
    }

    private readonly List<AcNode> _nodes = new();
    private readonly List<string> _patterns;

    public AhoCorasick(List<string> patterns)
    {
        _patterns = patterns;
        _nodes.Add(new AcNode()); // root = 0
        BuildTrie();
        BuildLinks();
    }

    private void BuildTrie()
    {
        for (int idx = 0; idx < _patterns.Count; idx++)
        {
            int cur = 0;
            foreach (char ch in _patterns[idx])
            {
                int c = ch;
                if (_nodes[cur].Next[c] == -1)
                {
                    _nodes[cur].Next[c] = _nodes.Count;
                    _nodes.Add(new AcNode());
                }
                cur = _nodes[cur].Next[c];
            }
            _nodes[cur].Output.Add(idx);
        }
    }

    private void BuildLinks()
    {
        var q = new Queue<int>();
        for (int c = 0; c < 128; c++)
        {
            int ch = _nodes[0].Next[c];
            if (ch == -1) { _nodes[0].Next[c] = 0; continue; }
            _nodes[ch].Fail = 0;
            q.Enqueue(ch);
        }

        while (q.Count > 0)
        {
            int u = q.Dequeue();
            int failU = _nodes[u].Fail;
            _nodes[u].Dict = _nodes[failU].Output.Count > 0
                ? failU
                : _nodes[failU].Dict;

            for (int c = 0; c < 128; c++)
            {
                int v = _nodes[u].Next[c];
                if (v == -1)
                {
                    _nodes[u].Next[c] = _nodes[_nodes[u].Fail].Next[c];
                }
                else
                {
                    _nodes[v].Fail = _nodes[_nodes[u].Fail].Next[c];
                    q.Enqueue(v);
                }
            }
        }
    }

    public Dictionary<int, List<int>> Search(string text)
    {
        var result = new Dictionary<int, List<int>>();
        for (int i = 0; i < _patterns.Count; i++)
            result[i] = new List<int>();

        int state = 0;
        for (int pos = 0; pos < text.Length; pos++)
        {
            int c = text[pos];
            if (c < 128) state = _nodes[state].Next[c];
            else state = 0;

            int tmp = state;
            while (tmp > 0)
            {
                foreach (int patIdx in _nodes[tmp].Output)
                    result[patIdx].Add(pos - _patterns[patIdx].Length + 1);
                tmp = _nodes[tmp].Dict; // -1 означает нет dict-ссылки
                if (tmp == -1) break;
            }
        }
        return result;
    }
}
```

## Задача 6. Наидлиннейший общий подстрочный фрагмент
```csharp
public static class SuffixArray
{
    public static int[] Build(string s)
    {
        int n = s.Length;
        var sa = Enumerable.Range(0, n).ToArray();
        var rank = s.Select(c => (int)c).ToArray();
        var tmp = new int[n];

        for (int k = 1; k < n; k <<= 1)
        {
            int kk = k; // capture for lambda
            var rankCopy = rank.ToArray();
            Array.Sort(sa, (x, y) =>
            {
                if (rankCopy[x] != rankCopy[y]) return rankCopy[x] - rankCopy[y];
                int rx = x + kk < n ? rankCopy[x + kk] : -1;
                int ry = y + kk < n ? rankCopy[y + kk] : -1;
                return rx - ry;
            });
            tmp[sa[0]] = 0;
            for (int i = 1; i < n; i++)
            {
                int prev = sa[i - 1], cur = sa[i];
                int rp = prev + kk < n ? rankCopy[prev + kk] : -1;
                int rc = cur + kk < n ? rankCopy[cur + kk] : -1;
                tmp[cur] = tmp[prev] + (rankCopy[prev] != rankCopy[cur] || rp != rc ? 1 : 0);
            }
            rank = tmp.ToArray();
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    public static int[] BuildLCP(string s, int[] sa)
    {
        int n = s.Length;
        var rank = new int[n];
        for (int i = 0; i < n; i++) rank[sa[i]] = i;

        var lcp = new int[n - 1];
        int k = 0;
        for (int i = 0; i < n; i++)
        {
            if (rank[i] == n - 1) { k = 0; continue; }
            int j = sa[rank[i] + 1];
            while (i + k < n && j + k < n && s[i + k] == s[j + k]) k++;
            lcp[rank[i]] = k;
            if (k > 0) k--;
        }
        return lcp;
    }

    public static string LongestCommonSubstring(string a, string b)
    {
        string s = a + "#" + b;
        int n1 = a.Length;
        var sa = Build(s);
        var lcp = BuildLCP(s, sa);

        int maxLen = 0, pos = 0;
        for (int i = 0; i < lcp.Length; i++)
        {
            if (lcp[i] > maxLen && (sa[i] < n1) != (sa[i + 1] < n1))
            {
                maxLen = lcp[i];
                pos = sa[i];
            }
        }
        return s.Substring(pos, maxLen);
    }
```

## Задача 7. Количество различных подстрок
```csharp
    public static long CountDistinctSubstrings(string s)
    {
        int n = s.Length;
        var sa = Build(s);
        var lcp = BuildLCP(s, sa);
        long total = (long)n * (n + 1) / 2;
        return total - lcp.Sum();
    }
}
```


## Задача 8. Топологическая сортировка (алгоритм Кана)
```csharp
public static class TopologicalSort
{
    public static (List<int>? order, List<int>? cycle) Sort(int n, List<(int, int)> edges)
    {
        var adj = new List<List<int>>();
        var indeg = new int[n];
        for (int i = 0; i < n; i++) adj.Add(new List<int>());

        foreach (var (u, v) in edges)
        {
            adj[u].Add(v);
            indeg[v]++;
        }

        var q = new Queue<int>(Enumerable.Range(0, n).Where(v => indeg[v] == 0));
        var order = new List<int>();
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            order.Add(u);
            foreach (int v in adj[u])
                if (--indeg[v] == 0) q.Enqueue(v);
        }

        if (order.Count == n) return (order, null);

        const int WHITE = 0, GRAY = 1, BLACK = 2;
        var color = new int[n];
        var path = new List<int>();
        List<int>? foundCycle = null;

        bool Dfs(int u)
        {
            color[u] = GRAY;
            path.Add(u);
            foreach (int v in adj[u])
            {
                if (color[v] == GRAY)
                {
                    int startIdx = path.IndexOf(v);
                    foundCycle = path.GetRange(startIdx, path.Count - startIdx);
                    foundCycle.Add(v); // замкнуть цикл
                    return true;
                }
                if (color[v] == WHITE && Dfs(v)) return true;
            }
            path.RemoveAt(path.Count - 1);
            color[u] = BLACK;
            return false;
        }

        for (int v = 0; v < n; v++)
            if (color[v] == WHITE && Dfs(v)) break;

        return (null, foundCycle);
    }
}
```

## Задача 9. Компоненты сильной связности (Косарайю)
```csharp
public static class SCC
{
    public static (int[] comp, List<HashSet<int>> condAdj, List<int> sources) Kosaraju(
        int n, List<List<int>> adj)
    {
        var visited = new bool[n];
        var order = new List<int>();

        for (int start = 0; start < n; start++)
        {
            if (visited[start]) continue;
            var stack = new Stack<(int node, int idx)>();
            stack.Push((start, 0));
            visited[start] = true;
            while (stack.Count > 0)
            {
                var (u, i) = stack.Pop();
                if (i < adj[u].Count)
                {
                    stack.Push((u, i + 1));
                    int v = adj[u][i];
                    if (!visited[v])
                    {
                        visited[v] = true;
                        stack.Push((v, 0));
                    }
                }
                else
                {
                    order.Add(u);
                }
            }
        }

        var radj = new List<List<int>>();
        for (int i = 0; i < n; i++) radj.Add(new List<int>());
        for (int u = 0; u < n; u++)
            foreach (int v in adj[u]) radj[v].Add(u);

        var comp = new int[n];
        Array.Fill(comp, -1);
        int cid = 0;

        for (int i = order.Count - 1; i >= 0; i--)
        {
            int start = order[i];
            if (comp[start] != -1) continue;
            var stack = new Stack<int>();
            stack.Push(start);
            comp[start] = cid;
            while (stack.Count > 0)
            {
                int u = stack.Pop();
                foreach (int v in radj[u])
                    if (comp[v] == -1) { comp[v] = cid; stack.Push(v); }
            }
            cid++;
        }

        var condAdj = new List<HashSet<int>>();
        for (int i = 0; i < cid; i++) condAdj.Add(new HashSet<int>());
        for (int u = 0; u < n; u++)
            foreach (int v in adj[u])
                if (comp[u] != comp[v]) condAdj[comp[u]].Add(comp[v]);

        var indeg = new int[cid];
        for (int u = 0; u < cid; u++)
            foreach (int v in condAdj[u]) indeg[v]++;
        var sources = Enumerable.Range(0, cid).Where(c => indeg[c] == 0).ToList();

        return (comp, condAdj, sources);
    }
}
```

## Задача 10. Дейкстра
```csharp
public static class Dijkstra
{
    public static (long[] dist, int[] parent) Run(List<List<(int to, int w)>> adj, int start)
    {
        int n = adj.Count;
        const long INF = long.MaxValue / 2;
        var dist = new long[n];
        Array.Fill(dist, INF);
        var parent = new int[n];
        Array.Fill(parent, -1);
        dist[start] = 0;

        var pq = new SortedSet<(long d, int u)>(Comparer<(long, int)>.Create(
            (a, b) => a.d != b.d ? a.d.CompareTo(b.d) : a.u.CompareTo(b.u)));
        pq.Add((0, start));

        while (pq.Count > 0)
        {
            var (d, u) = pq.Min;
            pq.Remove(pq.Min);
            if (d > dist[u]) continue;
            foreach (var (v, w) in adj[u])
            {
                if (dist[u] + w < dist[v])
                {
                    pq.Remove((dist[v], v));
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.Add((dist[v], v));
                }
            }
        }
        return (dist, parent);
    }

    public static List<int> RestorePath(int[] parent, int target)
    {
        var path = new List<int>();
        for (int v = target; v != -1; v = parent[v]) path.Add(v);
        path.Reverse();
        return path.Count == 1 && parent[target] == -1 && path[0] != target
            ? new List<int>() : path;
    }
}
```

## Задача 11. MST: Крускал + Прим
```csharp
public class DSU
{
    private readonly int[] _parent, _rank;
    public DSU(int n) { _parent = Enumerable.Range(0, n).ToArray(); _rank = new int[n]; }
    public int Find(int x)
    {
        while (_parent[x] != x) { _parent[x] = _parent[_parent[x]]; x = _parent[x]; }
        return x;
    }
    public bool Union(int a, int b)
    {
        a = Find(a); b = Find(b);
        if (a == b) return false;
        if (_rank[a] < _rank[b]) (a, b) = (b, a);
        _parent[b] = a;
        if (_rank[a] == _rank[b]) _rank[a]++;
        return true;
    }
}

public static class MST
{
    public static (List<(int, int, int)> edges, long cost) Kruskal(
        int n, List<(int u, int v, int w)> edges)
    {
        edges.Sort((a, b) => a.w - b.w);
        var dsu = new DSU(n);
        var mst = new List<(int, int, int)>();
        long total = 0;
        foreach (var (u, v, w) in edges)
            if (dsu.Union(u, v)) { mst.Add((u, v, w)); total += w; }
        return (mst, total);
    }

    public static (List<(int, int, int)> edges, long cost) Prim(
        List<List<(int to, int w)>> adj, int start = 0)
    {
        int n = adj.Count;
        var visited = new bool[n];
        var pq = new SortedSet<(int w, int u, int parent)>(
            Comparer<(int, int, int)>.Create((a, b) =>
                a.w != b.w ? a.w - b.w : (a.u != b.u ? a.u - b.u : a.parent - b.parent)));
        pq.Add((0, start, -1));
        var mst = new List<(int, int, int)>();
        long total = 0;

        while (pq.Count > 0)
        {
            var (w, u, par) = pq.Min; pq.Remove(pq.Min);
            if (visited[u]) continue;
            visited[u] = true;
            total += w;
            if (par != -1) mst.Add((par, u, w));
            foreach (var (v, w2) in adj[u])
                if (!visited[v]) pq.Add((w2, v, u));
        }
        return (mst, total);
    }
}
```

## Задача 12. Точки сочленения и мосты
```csharp
public static class Bridges
{
    public static (HashSet<int> artPoints, List<(int, int)> bridges)
        Find(int n, List<List<(int to, int edgeIdx)>> adj)
    {
        var tin = new int[n];
        var low = new int[n];
        var visited = new bool[n];
        int timer = 0;
        var artPoints = new HashSet<int>();
        var bridgesList = new List<(int, int)>();

        void Dfs(int u, int parentEdge)
        {
            visited[u] = true;
            tin[u] = low[u] = timer++;
            int children = 0;
            foreach (var (v, eIdx) in adj[u])
            {
                if (eIdx == parentEdge) continue; // пропускаем ребро, по которому пришли
                if (visited[v])
                {
                    low[u] = Math.Min(low[u], tin[v]);
                }
                else
                {
                    Dfs(v, eIdx);
                    low[u] = Math.Min(low[u], low[v]);
                    if (low[v] >= tin[u] && parentEdge != -1)
                        artPoints.Add(u);
                    if (low[v] > tin[u])
                        bridgesList.Add((u, v));
                    children++;
                }
            }
            if (parentEdge == -1 && children > 1)
                artPoints.Add(u);
        }

        for (int u = 0; u < n; u++)
            if (!visited[u]) Dfs(u, -1);

        return (artPoints, bridgesList);
    }
}
```

## Задача 13. Раскраска графа: эвристика Уэлша-Пауэлла
```csharp
public static class GraphColoring
{
    public static (int[] color, int numColors) WelshPowell(int n, List<List<int>> adj)
    {
        var vertices = Enumerable.Range(0, n)
            .OrderByDescending(v => adj[v].Count)
            .ToList();
        var color = new int[n];
        Array.Fill(color, -1);
        int usedColors = 0;

        foreach (int v in vertices)
        {
            if (color[v] != -1) continue;
            usedColors++;
            color[v] = usedColors;
            foreach (int u in vertices)
            {
                if (color[u] != -1) continue;
                bool neighborHasColor = adj[u].Any(w => color[w] == usedColors);
                if (!neighborHasColor) color[u] = usedColors;
            }
        }
        return (color, usedColors);
    }
}
```


## Задача 14. Алгоритм Куна (двудольный граф)
```csharp
public static class BipartiteMatching
{
    private static int[] _matchTo = Array.Empty<int>();
    private static List<List<int>> _prefs = new();

    private static bool Dfs(int student, bool[] seen)
    {
        foreach (int proj in _prefs[student])
        {
            if (seen[proj]) continue;
            seen[proj] = true;
            if (_matchTo[proj] == -1 || Dfs(_matchTo[proj], seen))
            {
                _matchTo[proj] = student;
                return true;
            }
        }
        return false;
    }

    public static List<(int student, int proj)> Kuhn(
        int nStudents, int nProjects, List<List<int>> preferences)
    {
        _prefs = preferences;
        _matchTo = new int[nProjects];
        Array.Fill(_matchTo, -1);

        for (int s = 0; s < nStudents; s++)
        {
            var seen = new bool[nProjects];
            Dfs(s, seen);
        }

        return _matchTo
            .Select((student, proj) => (student, proj))
            .Where(x => x.student != -1)
            .ToList();
    }
}
```


## Задача 16. Эдмондс-Карп
```csharp
public class MaxFlow
{
    private struct Edge { public int To, Rev, Cap; }

    private readonly List<List<Edge>> _graph;
    private readonly int _n;

    public MaxFlow(int n) { _n = n; _graph = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap)
    {
        _graph[from].Add(new Edge { To = to, Rev = _graph[to].Count, Cap = cap });
        _graph[to].Add(new Edge { To = from, Rev = _graph[from].Count - 1, Cap = 0 });
    }

    private bool Bfs(int s, int t, int[] parent, int[] parentEdge)
    {
        Array.Fill(parent, -1);
        parent[s] = s;
        var q = new Queue<int>();
        q.Enqueue(s);
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            for (int i = 0; i < _graph[u].Count; i++)
            {
                var e = _graph[u][i];
                if (parent[e.To] == -1 && e.Cap > 0)
                {
                    parent[e.To] = u;
                    parentEdge[e.To] = i;
                    if (e.To == t) return true;
                    q.Enqueue(e.To);
                }
            }
        }
        return false;
    }

    public int EdmondsKarp(int s, int t)
    {
        int flow = 0;
        var parent = new int[_n];
        var parentEdge = new int[_n];

        while (Bfs(s, t, parent, parentEdge))
        {
            int aug = int.MaxValue;
            for (int v = t; v != s;)
            {
                int u = parent[v];
                aug = Math.Min(aug, _graph[u][parentEdge[v]].Cap);
                v = u;
            }
            for (int v = t; v != s;)
            {
                int u = parent[v];
                int i = parentEdge[v];
                var e = _graph[u][i];
                e.Cap -= aug;
                _graph[u][i] = e;
                var re = _graph[e.To][e.Rev];
                re.Cap += aug;
                _graph[e.To][e.Rev] = re;
                v = u;
            }
            flow += aug;
        }
        return flow;
    }

    public HashSet<int> MinCutSide(int s)
    {
        var reachable = new HashSet<int>();
        var stack = new Stack<int>();
        stack.Push(s);
        reachable.Add(s);
        while (stack.Count > 0)
        {
            int u = stack.Pop();
            foreach (var e in _graph[u])
                if (!reachable.Contains(e.To) && e.Cap > 0)
                {
                    reachable.Add(e.To);
                    stack.Push(e.To);
                }
        }
        return reachable;
    }
}
```

## Задача 17. Диниц
```csharp
public class Dinic
{
    private struct Edge { public int To, Rev, Cap; }

    private readonly List<List<Edge>> _g;
    private int[] _level = Array.Empty<int>();
    private int[] _iter = Array.Empty<int>();
    private readonly int _n;

    public Dinic(int n) { _n = n; _g = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap)
    {
        _g[from].Add(new Edge { To = to, Rev = _g[to].Count, Cap = cap });
        _g[to].Add(new Edge { To = from, Rev = _g[from].Count - 1, Cap = 0 });
    }

    private bool Bfs(int s, int t)
    {
        _level = new int[_n];
        Array.Fill(_level, -1);
        _level[s] = 0;
        var q = new Queue<int>();
        q.Enqueue(s);
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            foreach (var e in _g[u])
                if (e.Cap > 0 && _level[e.To] < 0)
                {
                    _level[e.To] = _level[u] + 1;
                    q.Enqueue(e.To);
                }
        }
        return _level[t] >= 0;
    }

    private int Dfs(int u, int t, int f)
    {
        if (u == t) return f;
        for (; _iter[u] < _g[u].Count; _iter[u]++)
        {
            var e = _g[u][_iter[u]];
            if (e.Cap > 0 && _level[u] + 1 == _level[e.To])
            {
                int pushed = Dfs(e.To, t, Math.Min(f, e.Cap));
                if (pushed > 0)
                {
                    var fwd = _g[u][_iter[u]];
                    fwd.Cap -= pushed;
                    _g[u][_iter[u]] = fwd;
                    var bwd = _g[e.To][e.Rev];
                    bwd.Cap += pushed;
                    _g[e.To][e.Rev] = bwd;
                    return pushed;
                }
            }
        }
        return 0;
    }

    public long MaxFlow(int s, int t)
    {
        long flow = 0;
        while (Bfs(s, t))
        {
            _iter = new int[_n];
            int pushed;
            while ((pushed = Dfs(s, t, int.MaxValue)) > 0)
                flow += pushed;
        }
        return flow;
    }
}
```


## Задача 19. Венгерский алгоритм
```csharp
public static class Hungarian
{
    public static (int[] assignment, long totalCost) Solve(int[][] cost)
    {
        int n = cost.Length, m = cost[0].Length;
        var u = new long[n + 1];
        var v = new long[m + 1];
        var p = new int[m + 1];   // какой студент (1-индекс) назначен на проект j
        var way = new int[m + 1];

        for (int i = 1; i <= n; i++)
        {
            p[0] = i;
            int j0 = 0;
            var minv = new long[m + 1];
            Array.Fill(minv, long.MaxValue);
            var used = new bool[m + 1];

            while (true)
            {
                used[j0] = true;
                int i0 = p[j0];
                long delta = long.MaxValue;
                int j1 = -1;

                for (int j = 1; j <= m; j++)
                {
                    if (used[j]) continue;
                    long cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
                    if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                }

                for (int j = 0; j <= m; j++)
                {
                    if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                    else minv[j] -= delta;
                }
                j0 = j1;
                if (p[j0] == 0) break;
            }

            while (j0 != 0) { int j1 = way[j0]; p[j0] = p[j1]; j0 = j1; }
        }

        var assignment = new int[n];
        Array.Fill(assignment, -1);
        for (int j = 1; j <= m; j++)
            if (p[j] != 0) assignment[p[j] - 1] = j - 1;

        long totalCost = 0;
        for (int i = 0; i < n; i++)
            if (assignment[i] != -1) totalCost += cost[i][assignment[i]];

        return (assignment, totalCost);
    }
}
```

## Задача 20. Поток минимальной стоимости (MCMF)
```csharp
public class MinCostFlow
{
    private struct Edge { public int To, Cap, Rev; public long Cost; }

    private readonly List<List<Edge>> _g;
    private readonly int _n;

    public MinCostFlow(int n) { _n = n; _g = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap, long cost)
    {
        _g[from].Add(new Edge { To = to, Cap = cap, Cost = cost, Rev = _g[to].Count });
        _g[to].Add(new Edge { To = from, Cap = 0, Cost = -cost, Rev = _g[from].Count - 1 });
    }

    public (int flow, long cost) Solve(int s, int t, int maxFlow)
    {
        const long INF = long.MaxValue / 2;
        int totalFlow = 0;
        long totalCost = 0;
        var potential = new long[_n];

        while (totalFlow < maxFlow)
        {
            var dist = new long[_n];
            Array.Fill(dist, INF);
            dist[s] = 0;
            var prevv = new int[_n];
            var preve = new int[_n];
            Array.Fill(prevv, -1);

            var pq = new SortedSet<(long d, int u)>(
                Comparer<(long, int)>.Create((a, b) =>
                    a.d != b.d ? a.d.CompareTo(b.d) : a.u.CompareTo(b.u)));
            pq.Add((0, s));

            while (pq.Count > 0)
            {
                var (d, v) = pq.Min; pq.Remove(pq.Min);
                if (d > dist[v]) continue;
                for (int i = 0; i < _g[v].Count; i++)
                {
                    var e = _g[v][i];
                    if (e.Cap <= 0) continue;
                    long nd = dist[v] + e.Cost + potential[v] - potential[e.To];
                    if (nd < dist[e.To])
                    {
                        pq.Remove((dist[e.To], e.To));
                        dist[e.To] = nd;
                        prevv[e.To] = v;
                        preve[e.To] = i;
                        pq.Add((nd, e.To));
                    }
                }
            }

            if (dist[t] == INF) break;
            for (int v = 0; v < _n; v++)
                if (dist[v] < INF) potential[v] += dist[v];

            int aug = maxFlow - totalFlow;
            for (int v = t; prevv[v] != -1; v = prevv[v])
                aug = Math.Min(aug, _g[prevv[v]][preve[v]].Cap);

            for (int v = t; prevv[v] != -1; v = prevv[v])
            {
                var e = _g[prevv[v]][preve[v]];
                e.Cap -= aug;
                _g[prevv[v]][preve[v]] = e;
                var re = _g[v][e.Rev];
                re.Cap += aug;
                _g[v][e.Rev] = re;
            }

            totalFlow += aug;
            totalCost += aug * potential[t];
        }

        return (totalFlow, totalCost);
    }
}
```
# Задачи на базы данных
## Вариант 1. Научная лаборатория университета
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Лаборатория (id, название, корпус, телефон)
- Сотрудник (id, ФИО, email, телефон, дата_рождения)
- Должность (id, название, оклад)
- Научный_проект (id, название, бюджет, дата_начала, дата_окончания)
- Грант (id, название, сумма, источник, дата_получения)
- Публикация (id, название, дата, тип)
- Оборудование (id, название, инвентарный_номер, стоимость, дата_покупки)
- Заявка_на_оборудование (id, дата, статус, обоснование)

**Связи:**
- Сотрудник (0..M) работает_в (1) Лаборатория
- Научный_проект (0..M) ведётся_в (1) Лаборатория
- Оборудование (0..M) закреплено_за (1) Лаборатория
- Сотрудник (0..M) занимает (1) Должность
- Сотрудник (0..M) участвует_в (0..M) Научный_проект
- Сотрудник (0..M) является_автором (0..M) Публикация
- Научный_проект (0..M) финансируется (1) Грант
- Сотрудник (1) подал (0..M) Заявка_на_оборудование
- Оборудование (1) включено_в (0..M) Заявка_на_оборудование
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Laboratory(laboratory_id PK, name, location, foundation_year), 
Position(position_id PK, title, salary), 
Employee(employee_id PK, last_name, first_name, email UK, phone, birth_date, laboratory_id FK, position_id FK),
Grant(grant_id PK, name, amount, source, received_date), 
ScientificProject(project_id PK, name, budget, start_date, end_date, grant_id FK),
Publication(publication_id PK, name, date, type),
PublicationAuthor(publication_id PK FK, employee_id PK FK, author_order),
Equipment(equipment_id PK, name, inventory_number UK, cost, purchase_date, laboratory_id FK),
EquipmentRequest(request_id PK, date, status, justification, employee_id FK, equipment_id FK),
EmployeeProject(employee_id PK FK, project_id PK FK, role, participation_start).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативные сущности EmployeeProject и PublicationAuthor.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, employee_id функционально определяет личные данные сотрудника и его связи с лабораторией и должностью, laboratory_id определяет характеристики лаборатории, position_id определяет название должности и оклад, project_id определяет параметры научного проекта, grant_id определяет характеристики гранта. В связующих сущностях EmployeeProject и PublicationAuthor составные ключи (employee_id, project_id) и (publication_id, employee_id) определяют только атрибуты участия, такие как роль, дата участия и порядок автора, и не определяют данные исходных сущностей.

Проверка второй нормальной формы показывает отсутствие частичных функциональных зависимостей. Единственными сущностями с составным ключом являются EmployeeProject и PublicationAuthor, и все их неключевые атрибуты зависят от полного ключа. Отсутствуют зависимости вида employee_id → role или project_id → role, что исключает нарушение 2НФ. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные лаборатории не хранятся в Employee, а данные должности не дублируются в других сущностях). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Laboratory (
    laboratory_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100) NOT NULL,
    foundation_year INT CHECK (foundation_year >= 1900)
);
```

```sql
CREATE TABLE Position (
    position_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    salary NUMERIC(12,2) NOT NULL CHECK (salary > 0)
);
```

```sql
CREATE TABLE Employee (
    employee_id SERIAL PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(30),
    birth_date DATE,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    laboratory_id INT NOT NULL,
    position_id INT NOT NULL,

    FOREIGN KEY (laboratory_id) REFERENCES Laboratory(laboratory_id),
    FOREIGN KEY (position_id) REFERENCES Position(position_id)
);
```

```sql
CREATE TABLE Grant (
    grant_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    source VARCHAR(150) NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE
);
```

```sql
CREATE TABLE ScientificProject (
    project_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    budget NUMERIC(14,2) NOT NULL CHECK (budget > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    grant_id INT,

    FOREIGN KEY (grant_id) REFERENCES Grant(grant_id)
);
```

```sql
CREATE TABLE Publication (
    publication_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    publication_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    project_id INT NOT NULL,

    FOREIGN KEY (project_id) REFERENCES ScientificProject(project_id)
);
```

```sql
CREATE TABLE PublicationAuthor (
    publication_id INT NOT NULL,
    employee_id INT NOT NULL,
    author_order INT NOT NULL CHECK (author_order > 0),

    PRIMARY KEY (publication_id, employee_id),
    FOREIGN KEY (publication_id) REFERENCES Publication(publication_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);
```

```sql
CREATE TABLE Equipment (
    equipment_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    inventory_number VARCHAR(50) NOT NULL UNIQUE,
    cost NUMERIC(12,2) CHECK (cost >= 0),
    purchase_date DATE DEFAULT CURRENT_DATE,
    laboratory_id INT NOT NULL,

    FOREIGN KEY (laboratory_id) REFERENCES Laboratory(laboratory_id)
);
```

```sql
CREATE TABLE EquipmentRequest (
    request_id SERIAL PRIMARY KEY,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    justification TEXT NOT NULL,
    employee_id INT NOT NULL,
    equipment_id INT NOT NULL,

    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
);
```

```sql
CREATE TABLE EmployeeProject (
    employee_id INT NOT NULL,
    project_id INT NOT NULL,
    role VARCHAR(100) NOT NULL,
    participation_start DATE NOT NULL DEFAULT CURRENT_DATE,

    PRIMARY KEY (employee_id, project_id),

    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    FOREIGN KEY (project_id) REFERENCES ScientificProject(project_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблиц EmployeeProject, EquipmentRequest и ScientificProject, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_employee_laboratory
ON Employee(laboratory_id);

CREATE INDEX idx_employee_position
ON Employee(position_id);

CREATE INDEX idx_project_grant
ON ScientificProject(grant_id);

CREATE INDEX idx_request_employee
ON EquipmentRequest(employee_id);

CREATE INDEX idx_request_equipment
ON EquipmentRequest(equipment_id);
```
### 4. SQL: команды управления данными
**Laboratory**
```sql
INSERT INTO Laboratory (name, location, foundation_year)
VALUES 
('BioLab', 'Building A', 2005),
('NanoLab', 'Building B', 2010);
```

```sql
UPDATE Laboratory
SET name = 'Updated Lab',
    location = 'Building C',
    foundation_year = 2015
WHERE laboratory_id = 1;
```

```sql
DELETE FROM Laboratory
WHERE laboratory_id = 2;
```

**Position**
```sql
INSERT INTO Position (title, salary)
VALUES 
('Researcher', 50000),
('Senior Researcher', 80000);
```

```sql
UPDATE Position
SET title = 'Lead Researcher',
    salary = 90000
WHERE position_id = 1;
```

```sql
DELETE FROM Position
WHERE position_id = 2;
```

**Employee**
```sql
INSERT INTO Employee (last_name, first_name, email, phone, birth_date, laboratory_id, position_id)
VALUES 
('Ivanov', 'Ivan', 'ivanov@mail.com', '12345', '1990-01-01', 1, 1),
('Petrov', 'Petr', 'petrov@mail.com', '54321', '1992-02-02', 1, 1);
```

```sql
UPDATE Employee
SET last_name = 'Sidorov',
    first_name = 'Sergey',
    email = 'sidorov@mail.com',
    phone = '99999',
    birth_date = '1991-03-03',
    laboratory_id = 1,
    position_id = 1
WHERE employee_id = 1;
```

```sql
DELETE FROM Employee
WHERE employee_id = 2;
```

**Grant**
```sql
INSERT INTO Grant (name, amount, source, received_date)
VALUES 
('AI Research', 1000000, 'EU', '2024-01-01'),
('Quantum Project', 2000000, 'NASA', '2024-02-01');
```

```sql
UPDATE Grant
SET name = 'Updated Grant',
    amount = 1500000,
    source = 'Updated Source',
    received_date = '2024-03-01'
WHERE grant_id = 1;
```

```sql
DELETE FROM Grant
WHERE grant_id = 2;
```

**ScientificProject**
```sql
INSERT INTO ScientificProject (name, budget, start_date, end_date, grant_id)
VALUES 
('AI System', 500000, '2024-01-01', NULL, 1),
('Robot Control', 700000, '2024-02-01', NULL, 1);
```

```sql
UPDATE ScientificProject
SET name = 'Updated Project',
    budget = 600000,
    start_date = '2024-01-10',
    end_date = '2025-01-01',
    grant_id = 1
WHERE project_id = 1;
```

```sql
DELETE FROM ScientificProject
WHERE project_id = 2;
```

**Publication**
```sql
INSERT INTO Publication (name, publication_date, type, project_id)
VALUES 
('AI Paper', '2024-05-01', 'Journal', 1),
('Robot Paper', '2024-06-01', 'Conference', 1);
```

```sql
UPDATE Publication
SET name = 'Updated Publication',
    publication_date = '2024-07-01',
    type = 'Journal',
    project_id = 1
WHERE publication_id = 1;
```

```sql
DELETE FROM Publication
WHERE publication_id = 2;
```

**PublicationAuthor**
```sql
INSERT INTO PublicationAuthor (publication_id, employee_id, author_order)
VALUES 
(1, 1, 1),
(1, 2, 2);
```

```sql
UPDATE PublicationAuthor
SET author_order = 2
WHERE publication_id = 1 AND employee_id = 1;
```

```sql
DELETE FROM PublicationAuthor
WHERE publication_id = 1 AND employee_id = 2;
```

**Equipment**
```sql
INSERT INTO Equipment (name, inventory_number, cost, purchase_date, laboratory_id)
VALUES 
('Microscope', 'EQ-001', 10000, '2023-01-01', 1),
('Centrifuge', 'EQ-002', 20000, '2023-02-01', 1);
```

```sql
UPDATE Equipment
SET name = 'Updated Equipment',
    inventory_number = 'EQ-999',
    cost = 15000,
    purchase_date = '2023-03-01',
    laboratory_id = 1
WHERE equipment_id = 1;
```

```sql
DELETE FROM Equipment
WHERE equipment_id = 2;
```

**EquipmentRequest**
```sql
INSERT INTO EquipmentRequest (request_date, status, justification, employee_id, equipment_id)
VALUES 
('2024-01-01', 'PENDING', 'For experiments', 1, 1),
('2024-02-01', 'APPROVED', 'Urgent need', 1, 1);
```

```sql
UPDATE EquipmentRequest
SET request_date = '2024-03-01',
    status = 'REJECTED',
    justification = 'Not needed',
    employee_id = 1,
    equipment_id = 1
WHERE request_id = 1;
```

```sql
DELETE FROM EquipmentRequest
WHERE request_id = 2;
```

**EmployeeProject**
```sql
INSERT INTO EmployeeProject (employee_id, project_id, role, participation_start)
VALUES 
(1, 1, 'Developer', '2024-01-01'),
(1, 2, 'Analyst', '2024-02-01');
```

```sql
UPDATE EmployeeProject
SET role = 'Lead Developer',
    participation_start = '2024-03-01'
WHERE employee_id = 1 AND project_id = 1;
```

```sql
DELETE FROM EmployeeProject
WHERE employee_id = 1 AND project_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Сотрудник не может подать заявку на оборудование, если он не закреплён ни за одним научным проектом. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется проверка через другую таблицу)
```sql
CREATE OR REPLACE FUNCTION check_employee_project_before_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM EmployeeProject ep
        WHERE ep.employee_id = NEW.employee_id
    ) THEN
        RAISE EXCEPTION 'Employee must participate in at least one project to request equipment';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_check_employee_project
BEFORE INSERT ON EquipmentRequest
FOR EACH ROW
EXECUTE FUNCTION check_employee_project_before_request();
```

**Таблица аудита**
```sql
CREATE TABLE EquipmentRequest_Audit (
    audit_id SERIAL PRIMARY KEY,
    request_id INT,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_equipment_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO EquipmentRequest_Audit (
        request_id,
        old_status,
        new_status,
        operation_type
    )
    VALUES (
        NEW.request_id,
        OLD.status,
        NEW.status,
        TG_OP
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_equipment_request
AFTER UPDATE ON EquipmentRequest
FOR EACH ROW
EXECUTE FUNCTION audit_equipment_request();
```

### 6. Сложный SQL-запрос
Вывести проекты, количество участников проекта и общий объём финансирования гранта.
```sql
SELECT
    p.name AS project,
    COUNT(ep.employee_id) AS participant_count,
    g.amount AS grant_amount

FROM ScientificProject p

JOIN EmployeeProject ep
    ON p.project_id = ep.project_id

LEFT JOIN Grant g
    ON p.grant_id = g.grant_id

GROUP BY
    p.project_id,
    p.name,
    g.amount

ORDER BY participant_count DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=labs_db");
        conn.Open();

        // 1. CREATE TABLE (см. SQL: DDL)
        Execute(conn, SQL.CreateTables);

        // 2. INSERT DATA (см. SQL: заполнение таблиц)
        Execute(conn, SQL.InsertData);

        // 3. UPDATE / DELETE (см. SQL: DML операции)
        Execute(conn, SQL.ModifyData);

        // 4. SELECT (см. SQL: аналитический запрос)
        ExecuteQuery(conn, SQL.ReportQuery);

        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            Console.WriteLine(reader[0]);
        }
    }
}
```

## Вариант 2. Конференция
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Участник (id, фио, email, телефон, ученая_степень, должность)
- Организация (id, название, город, страна, сайт)
- Секция (id, название, дата_время, аудитория, модератор)
- Доклад (id, название, аннотация, файл, длительность, статус)
- Рецензент (id, фио, email, компетенция, организация)
- Рецензия (id, оценка, комментарий, дата, рекомендация)
- Аудитория (id, номер, корпус, этаж, вместимость, оборудование)
- Сертификат (id, номер, дата_выдачи, шаблон)

**Связи:**
- Участник (0..M) представляет (1) Организация
- Участник (0..M) подаёт (0..M) Доклад
- Доклад (0..M) включён_в (1) Секция
- Доклад (1) имеет (0..M) Рецензия
- Рецензент (1) пишет (0..M) Рецензия
- Секция (1) проводится_в (1) Аудитория
- Участник (1) получает (0..1) Сертификат
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Organization(organization_id PK, name, city, country, website),
Participant(participant_id PK, full_name, email UK, phone, academic_degree, position, organization_id FK),
Auditorium(auditorium_id PK, room_number, building, floor, capacity, equipment),
Section(section_id PK, name, date_time, moderator, auditorium_id FK),
Report(report_id PK, title, abstract, file_path, duration, status, section_id FK),
Reviewer(reviewer_id PK, full_name, email UK, expertise, organization),
Review(reviewer_id PK FK, report_id PK FK, score, comment, review_date, recommendation),
Certificate(certificate_id PK, serial_number UK, issue_date, template, participant_id FK),
ReportAuthor(report_id PK FK, participant_id PK FK, author_role, author_order).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность ReportAuthor.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, participant_id функционально определяет личные данные участника и его связь с организацией, organization_id определяет характеристики организации, section_id определяет параметры секции, report_id определяет характеристики доклада. В связующей сущности ReportAuthor составной ключ (report_id, participant_id) определяет только атрибуты участия, такие как роль автора и порядок, и не определяет данные исходных сущностей.

Проверка второй нормальной формы показывает отсутствие частичных функциональных зависимостей. Единственной сущностью с составным ключом является ReportAuthor, и все её неключевые атрибуты зависят от полного ключа (report_id, participant_id). Отсутствуют зависимости вида report_id → author_role или participant_id → author_role, что исключает нарушение 2НФ. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные организации не хранятся в Participant, а данные аудитории не дублируются в Section). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Россия',
    website VARCHAR(300)
);
```

```sql
CREATE TABLE Participant (
    participant_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    academic_degree VARCHAR(100),
    position VARCHAR(200),
    organization_id INT,

    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
);
```

```sql
CREATE TABLE Auditorium (
    auditorium_id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor INT CHECK (floor >= 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    equipment TEXT
);
```

```sql
CREATE TABLE Section (
    section_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    moderator VARCHAR(200),
    auditorium_id INT NOT NULL,

    FOREIGN KEY (auditorium_id) REFERENCES Auditorium(auditorium_id)
);
```

```sql
CREATE TABLE Report (
    report_id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    abstract TEXT NOT NULL,
    file_path VARCHAR(500),
    duration INT CHECK (duration > 0),
    status VARCHAR(50) DEFAULT 'submitted',
    section_id INT NOT NULL,

    FOREIGN KEY (section_id) REFERENCES Section(section_id)
);
```

```sql
CREATE TABLE Reviewer (
    reviewer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    expertise VARCHAR(500),
    organization VARCHAR(200)
);
```

```sql
CREATE TABLE Review (
    reviewer_id INT NOT NULL,
    report_id INT NOT NULL,
    score INT CHECK (score BETWEEN 1 AND 10),
    comment TEXT,
    review_date DATE DEFAULT CURRENT_DATE,
    recommendation VARCHAR(50),

    PRIMARY KEY (reviewer_id, report_id),

    FOREIGN KEY (reviewer_id) REFERENCES Reviewer(reviewer_id),
    FOREIGN KEY (report_id) REFERENCES Report(report_id)
);
```

```sql
CREATE TABLE Certificate (
    certificate_id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    template VARCHAR(100),
    participant_id INT NOT NULL UNIQUE,

    FOREIGN KEY (participant_id) REFERENCES Participant(participant_id)
);
```

```sql
CREATE TABLE ReportAuthor (
    report_id INT NOT NULL,
    participant_id INT NOT NULL,
    author_role VARCHAR(50) DEFAULT 'author',
    author_order INT CHECK (author_order > 0),

    PRIMARY KEY (report_id, participant_id),

    FOREIGN KEY (report_id) REFERENCES Report(report_id),
    FOREIGN KEY (participant_id) REFERENCES Participant(participant_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблиц ReportAuthor, Review и Report, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_participant_organization
ON Participant(organization_id);

CREATE INDEX idx_report_section
ON Report(section_id);

CREATE INDEX idx_section_auditorium
ON Section(auditorium_id);

CREATE INDEX idx_certificate_participant
ON Certificate(participant_id);
```
### 4. SQL: команды управления данными
**Organization**
```sql
INSERT INTO Organization (name, city, country, website)
VALUES 
('МГУ', 'Москва', 'Россия', 'msu.ru'),
('СПбГУ', 'Санкт-Петербург', 'Россия', 'spbu.ru');
```

```sql
UPDATE Organization
SET name = 'МГУ им. Ломоносова',
    city = 'Москва',
    country = 'Россия',
    website = 'new.msu.ru'
WHERE organization_id = 1;
```

```sql
DELETE FROM Organization
WHERE organization_id = 2;
```

**Participant**
```sql
INSERT INTO Participant (full_name, email, phone, academic_degree, organization_id)
VALUES 
('Иванов Иван', 'ivan@mail.ru', '111-111', 'магистр', 1),
('Петрова Анна', 'anna@mail.ru', '222-222', 'аспирант', 1);
```

```sql
UPDATE Participant
SET full_name = 'Иванов Пётр',
    email = 'petr@mail.ru',
    phone = '333-333',
    academic_degree = 'кандидат наук',
    position = 'доцент',
    organization_id = 1
WHERE participant_id = 1;
```

```sql
DELETE FROM Participant
WHERE participant_id = 2;
```

**Auditorium**
```sql
INSERT INTO Auditorium (room_number, building, floor, capacity, equipment)
VALUES 
('101', 'Главный корпус', 1, 100, 'проектор, доска'),
('205', 'Лабораторный корпус', 2, 30, 'компьютеры');
```

```sql
UPDATE Auditorium
SET room_number = '201',
    building = 'Главный корпус',
    floor = 2,
    capacity = 120,
    equipment = 'проектор, микрофон'
WHERE auditorium_id = 1;
```

```sql
DELETE FROM Auditorium
WHERE auditorium_id = 2;
```

**Section**
```sql
INSERT INTO Section (name, date_time, moderator, auditorium_id)
VALUES 
('Искусственный интеллект', '2024-12-15 10:00:00', 'проф. Иванов', 1),
('Базы данных', '2024-12-15 14:00:00', 'проф. Петров', 1);
```

```sql
UPDATE Section
SET name = 'Машинное обучение',
    date_time = '2024-12-16 10:00:00',
    moderator = 'проф. Сидоров',
    auditorium_id = 1
WHERE section_id = 1;
```

```sql
DELETE FROM Section
WHERE section_id = 2;
```

**Report**
```sql
INSERT INTO Report (title, abstract, duration, status, section_id)
VALUES 
('Нейросетевой анализ текстов', 'В работе рассматриваются...', 20, 'submitted', 1),
('Обзор методов NLP', 'Представлен обзор современных методов...', 15, 'submitted', 1);
```

```sql
UPDATE Report
SET title = 'Глубокое обучение для NLP',
    abstract = 'Обновлённая аннотация...',
    duration = 25,
    status = 'accepted',
    section_id = 1
WHERE report_id = 1;
```

```sql
DELETE FROM Report
WHERE report_id = 2;
```

**Reviewer**
```sql
INSERT INTO Reviewer (full_name, email, expertise, organization)
VALUES 
('д.ф.-м.н. Сидоров', 'sidorov@expert.ru', 'ИИ, NLP', 'Институт РАН'),
('к.т.н. Смирнов', 'smirnov@expert.ru', 'Базы данных', 'МГУ');
```

```sql
UPDATE Reviewer
SET full_name = 'д.ф.-м.н. Сидоров С.С.',
    email = 'sidorov@newmail.ru',
    expertise = 'ИИ, NLP, компьютерное зрение',
    organization = 'МГУ'
WHERE reviewer_id = 1;
```

```sql
DELETE FROM Reviewer
WHERE reviewer_id = 2;
```

**Review**
```sql
INSERT INTO Review (reviewer_id, report_id, score, comment, recommendation)
VALUES 
(1, 1, 8, 'Хорошая работа, рекомендую', 'accept'),
(1, 2, 6, 'Требуются доработки', 'minor_revision');
```

```sql
UPDATE Review
SET score = 9,
    comment = 'Отличная работа',
    review_date = '2024-11-10',
    recommendation = 'accept'
WHERE reviewer_id = 1 AND report_id = 1;
```

```sql
DELETE FROM Review
WHERE reviewer_id = 1 AND report_id = 2;
```

**Certificate**
```sql
INSERT INTO Certificate (serial_number, template, participant_id)
VALUES 
('CERT-001', 'standard', 1),
('CERT-002', 'standard', 2);
```

```sql
UPDATE Certificate
SET serial_number = 'CERT-999',
    issue_date = '2024-12-20',
    template = 'premium'
WHERE certificate_id = 1;
```

```sql
DELETE FROM Certificate
WHERE certificate_id = 2;
```

**ReportAuthor**
```sql
INSERT INTO ReportAuthor (report_id, participant_id, author_role, author_order)
VALUES 
(1, 1, 'author', 1),
(1, 2, 'coauthor', 2);
```

```sql
UPDATE ReportAuthor
SET author_role = 'presenter',
    author_order = 1
WHERE report_id = 1 AND participant_id = 1;
```

```sql
DELETE FROM ReportAuthor
WHERE report_id = 1 AND participant_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Рецензент не может рецензировать доклад, если он является его автором. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется проверка через другую таблицу)
```sql
CREATE OR REPLACE FUNCTION check_reviewer_not_author()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ReportAuthor ra
        JOIN Participant p ON p.participant_id = ra.participant_id
        JOIN Reviewer r ON r.email = p.email
        WHERE ra.report_id = NEW.report_id
          AND r.reviewer_id = NEW.reviewer_id
    ) THEN
        RAISE EXCEPTION 'Reviewer cannot review their own report';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_check_reviewer_not_author
BEFORE INSERT ON Review
FOR EACH ROW
EXECUTE FUNCTION check_reviewer_not_author();
```

**Таблица аудита**
```sql
CREATE TABLE Report_Audit (
    audit_id SERIAL PRIMARY KEY,
    report_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_report_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Report_Audit (
        report_id,
        old_status,
        new_status,
        operation_type
    )
    VALUES (
        NEW.report_id,
        OLD.status,
        NEW.status,
        TG_OP
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_report_status
AFTER UPDATE ON Report
FOR EACH ROW
EXECUTE FUNCTION audit_report_status();
```

### 6. Сложный SQL-запрос
Вывести секции, количество докладов в каждой секции и среднюю оценку рецензий.
```sql
SELECT
    s.name AS section,
    COUNT(DISTINCT r.report_id) AS report_count,
    AVG(rv.score) AS avg_score

FROM Section s

LEFT JOIN Report r
    ON s.section_id = r.section_id

LEFT JOIN Review rv
    ON r.report_id = rv.report_id

GROUP BY
    s.section_id,
    s.name

ORDER BY report_count DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=conference_db");
        conn.Open();

        // 1. CREATE TABLE (см. SQL: DDL)
        Execute(conn, SQL.CreateTables);

        // 2. INSERT DATA (см. SQL: заполнение таблиц)
        Execute(conn, SQL.InsertData);

        // 3. UPDATE / DELETE (см. SQL: DML операции)
        Execute(conn, SQL.ModifyData);

        // 4. SELECT (см. SQL: аналитический запрос)
        ExecuteQuery(conn, SQL.ReportQuery);

        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            Console.WriteLine(reader[0]);
        }
    }
}
```

## Вариант 3. Электронный журнал
![[Pasted image 20260614133838.png]]
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Студент (id, фио, email, телефон, дата_рождения, номер_зачётки)
- Группа (id, название, курс, факультет, год_поступления)
- Дисциплина (id, название, код, часы_лекции, часы_практики, семестр, форма_контроля)
- Преподаватель (id, фио, email, телефон, кафедра, учёная_степень)
- Занятие (id, дата, тема, тип, аудитория)
- Оценка (id, балл, дата_выставления, тип)
- Пересдача (id, дата, новый_балл, номер_попытки, комиссия)
- Ведомость (id, семестр, учебный_год, дата_закрытия, статус)

**Связи:**
- Студент (0..M) учится_в (1) Группа
- Группа (0..M) изучает (0..M) Дисциплина
- Преподаватель (0..M) ведёт (0..M) Дисциплина
- Преподаватель (1) проводит (0..M) Занятие
- Дисциплина (1) включает (0..M) Занятие
- Группа (1) посещает (0..M) Занятие
- Студент (1) получает (0..M) Оценка
- Занятие (1) содержит (0..M) Оценка
- Студент (0..M) пересдаёт (0..M) Дисциплина
- Ведомость (1) содержит (0..M) Оценка
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Group(group_id PK, name, course, faculty, enrollment_year),
Student(student_id PK, full_name, email UK, phone, birth_date, record_book UK, group_id FK),
Discipline(discipline_id PK, name, code UK, lecture_hours, practice_hours, semester, control_form),
Teacher(teacher_id PK, full_name, email UK, phone, department, academic_degree),
Lesson(lesson_id PK, lesson_date, topic, lesson_type, classroom, discipline_id FK, teacher_id FK, group_id FK),
Grade(grade_id PK, score, grade_date, grade_type, student_id FK, lesson_id FK, grade_report_id FK),
Retake(retake_id PK, retake_date, new_score, attempt_number, commission, student_id FK, discipline_id FK),
GradeReport(grade_report_id PK, semester, academic_year, close_date, status, discipline_id FK, group_id FK),
Curriculum(group_id PK FK, discipline_id PK FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативные сущности Curriculum, а также TeacherDiscipline.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, student_id функционально определяет личные данные студента и его связь с группой, group_id определяет характеристики группы, discipline_id определяет параметры дисциплины. В связующих сущностях Curriculum и TeacherDiscipline составные ключи (group_id, discipline_id) и (teacher_id, discipline_id) определяют только сам факт связи и не определяют данные исходных сущностей.

Проверка второй нормальной формы показывает отсутствие частичных функциональных зависимостей. Единственными сущностями с составным ключом являются Curriculum и TeacherDiscipline, и все их неключевые атрибуты зависят от полного ключа. Отсутствуют зависимости вида group_id → (атрибуты) или discipline_id → (атрибуты) внутри этих таблиц, что исключает нарушение 2НФ. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные группы не хранятся в Student, а данные дисциплины не дублируются в Lesson). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE "Group" (
    group_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    course INT CHECK (course BETWEEN 1 AND 6) NOT NULL,
    faculty VARCHAR(200) NOT NULL,
    enrollment_year INT CHECK (enrollment_year > 2000)
);
```

```sql
CREATE TABLE Student (
    student_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    record_book VARCHAR(20) NOT NULL UNIQUE,
    group_id INT NOT NULL,

    FOREIGN KEY (group_id) REFERENCES "Group"(group_id)
);
```

```sql
CREATE TABLE Discipline (
    discipline_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    lecture_hours INT DEFAULT 0,
    practice_hours INT DEFAULT 0,
    semester INT CHECK (semester BETWEEN 1 AND 12) NOT NULL,
    control_form VARCHAR(50)
);
```

```sql
CREATE TABLE Teacher (
    teacher_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(200) NOT NULL,
    academic_degree VARCHAR(100)
);
```

```sql
CREATE TABLE Lesson (
    lesson_id SERIAL PRIMARY KEY,
    lesson_date DATE NOT NULL,
    topic VARCHAR(500),
    lesson_type VARCHAR(50) NOT NULL,
    classroom VARCHAR(50),
    discipline_id INT NOT NULL,
    teacher_id INT NOT NULL,
    group_id INT NOT NULL,

    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id),
    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id),
    FOREIGN KEY (group_id) REFERENCES "Group"(group_id)
);
```

```sql
CREATE TABLE GradeReport (
    grade_report_id SERIAL PRIMARY KEY,
    semester INT CHECK (semester BETWEEN 1 AND 12) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    close_date DATE,
    status VARCHAR(50) DEFAULT 'open',
    discipline_id INT NOT NULL,
    group_id INT NOT NULL,

    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id),
    FOREIGN KEY (group_id) REFERENCES "Group"(group_id)
);
```

```sql
CREATE TABLE Grade (
    grade_id SERIAL PRIMARY KEY,
    score DECIMAL(5,2) CHECK (score BETWEEN 0 AND 100),
    grade_date DATE DEFAULT CURRENT_DATE,
    grade_type VARCHAR(50) DEFAULT 'current',
    student_id INT NOT NULL,
    lesson_id INT,
    grade_report_id INT,

    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (lesson_id) REFERENCES Lesson(lesson_id),
    FOREIGN KEY (grade_report_id) REFERENCES GradeReport(grade_report_id)
);
```

```sql
CREATE TABLE Retake (
    retake_id SERIAL PRIMARY KEY,
    retake_date DATE NOT NULL,
    new_score DECIMAL(5,2) CHECK (new_score BETWEEN 0 AND 100),
    attempt_number INT NOT NULL CHECK (attempt_number > 0),
    commission TEXT,
    student_id INT NOT NULL,
    discipline_id INT NOT NULL,

    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id)
);
```

```sql
CREATE TABLE Curriculum (
    group_id INT NOT NULL,
    discipline_id INT NOT NULL,

    PRIMARY KEY (group_id, discipline_id),

    FOREIGN KEY (group_id) REFERENCES "Group"(group_id),
    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id)
);
```

```sql
CREATE TABLE TeacherDiscipline (
    teacher_id INT NOT NULL,
    discipline_id INT NOT NULL,

    PRIMARY KEY (teacher_id, discipline_id),

    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id),
    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблиц Lesson, Grade и Retake, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_student_group
ON Student(group_id);

CREATE INDEX idx_lesson_discipline
ON Lesson(discipline_id);

CREATE INDEX idx_lesson_teacher
ON Lesson(teacher_id);

CREATE INDEX idx_lesson_group
ON Lesson(group_id);

CREATE INDEX idx_grade_student
ON Grade(student_id);

CREATE INDEX idx_retake_student
ON Retake(student_id);
```
### 4. SQL: команды управления данными
**Group**
```sql
INSERT INTO "Group" (name, course, faculty, enrollment_year)
VALUES 
('ИС-21', 2, 'ФИнИТ', 2022),
('ИС-22', 2, 'ФИнИТ', 2022);
```

```sql
UPDATE "Group"
SET name = 'ИС-31',
    course = 3,
    faculty = 'ФИнИТ',
    enrollment_year = 2021
WHERE group_id = 1;
```

```sql
DELETE FROM "Group"
WHERE group_id = 2;
```

**Student**
```sql
INSERT INTO Student (full_name, email, phone, birth_date, record_book, group_id)
VALUES 
('Алексеев Алексей', 'alexeev@mail.ru', '111-111', '2004-01-01', 'ЗН-001', 1),
('Борисова Елена', 'borisova@mail.ru', '222-222', '2004-02-01', 'ЗН-002', 1);
```

```sql
UPDATE Student
SET full_name = 'Алексеев Иван',
    email = 'ivan@mail.ru',
    phone = '333-333',
    birth_date = '2004-03-01',
    record_book = 'ЗН-003',
    group_id = 1
WHERE student_id = 1;
```

```sql
DELETE FROM Student
WHERE student_id = 2;
```

**Discipline**
```sql
INSERT INTO Discipline (name, code, lecture_hours, practice_hours, semester, control_form)
VALUES 
('Математический анализ', 'Б1.О.01', 64, 64, 1, 'exam'),
('Программирование', 'Б1.О.02', 32, 64, 1, 'exam');
```

```sql
UPDATE Discipline
SET name = 'Матанализ',
    code = 'Б1.О.01',
    lecture_hours = 72,
    practice_hours = 72,
    semester = 1,
    control_form = 'exam'
WHERE discipline_id = 1;
```

```sql
DELETE FROM Discipline
WHERE discipline_id = 2;
```

**Teacher**
```sql
INSERT INTO Teacher (full_name, email, phone, department, academic_degree)
VALUES 
('проф. Иванов И.И.', 'ivanov@university.ru', '000-000', 'Кафедра математики', 'д.ф.-м.н.'),
('доц. Петрова А.С.', 'petrova@university.ru', '111-111', 'Кафедра информатики', 'к.т.н.');
```

```sql
UPDATE Teacher
SET full_name = 'проф. Иванов Иван',
    email = 'ivan@newmail.ru',
    phone = '999-999',
    department = 'Кафедра математики',
    academic_degree = 'д.ф.-м.н.'
WHERE teacher_id = 1;
```

```sql
DELETE FROM Teacher
WHERE teacher_id = 2;
```

**Lesson**
```sql
INSERT INTO Lesson (lesson_date, topic, lesson_type, classroom, discipline_id, teacher_id, group_id)
VALUES 
('2024-09-02', 'Предел функции', 'lecture', '101', 1, 1, 1),
('2024-09-03', 'Вычисление пределов', 'seminar', '102', 1, 1, 1);
```

```sql
UPDATE Lesson
SET lesson_date = '2024-09-04',
    topic = 'Непрерывность функции',
    lesson_type = 'lecture',
    classroom = '201',
    discipline_id = 1,
    teacher_id = 1,
    group_id = 1
WHERE lesson_id = 1;
```

```sql
DELETE FROM Lesson
WHERE lesson_id = 2;
```

**GradeReport**
```sql
INSERT INTO GradeReport (semester, academic_year, status, discipline_id, group_id)
VALUES 
(1, '2024-2025', 'open', 1, 1),
(1, '2024-2025', 'open', 2, 1);
```

```sql
UPDATE GradeReport
SET semester = 1,
    academic_year = '2024-2025',
    close_date = '2025-01-15',
    status = 'closed',
    discipline_id = 1,
    group_id = 1
WHERE grade_report_id = 1;
```

```sql
DELETE FROM GradeReport
WHERE grade_report_id = 2;
```

**Grade**
```sql
INSERT INTO Grade (score, grade_type, student_id, lesson_id, grade_report_id)
VALUES 
(85, 'current', 1, 1, 1),
(90, 'current', 2, 1, 1);
```

```sql
UPDATE Grade
SET score = 88,
    grade_date = '2024-10-01',
    grade_type = 'midterm',
    student_id = 1,
    lesson_id = 1,
    grade_report_id = 1
WHERE grade_id = 1;
```

```sql
DELETE FROM Grade
WHERE grade_id = 2;
```

**Retake**
```sql
INSERT INTO Retake (retake_date, new_score, attempt_number, student_id, discipline_id)
VALUES 
('2025-01-20', 75, 1, 1, 1),
('2025-02-01', 80, 2, 1, 1);
```

```sql
UPDATE Retake
SET retake_date = '2025-01-25',
    new_score = 78,
    attempt_number = 1,
    commission = 'проф. Иванов, доц. Петрова',
    student_id = 1,
    discipline_id = 1
WHERE retake_id = 1;
```

```sql
DELETE FROM Retake
WHERE retake_id = 2;
```

**Curriculum**
```sql
INSERT INTO Curriculum (group_id, discipline_id)
VALUES 
(1, 1),
(1, 2);
```

```sql
DELETE FROM Curriculum
WHERE group_id = 1 AND discipline_id = 2;
```

**TeacherDiscipline**
```sql
INSERT INTO TeacherDiscipline (teacher_id, discipline_id)
VALUES 
(1, 1),
(2, 2);
```

```sql
DELETE FROM TeacherDiscipline
WHERE teacher_id = 2 AND discipline_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Балл на пересдаче не может быть ниже предыдущего балла за ту же дисциплину. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется проверка по другой записи в той же таблице)
```sql
CREATE OR REPLACE FUNCTION check_retake_score()
RETURNS TRIGGER AS $$
DECLARE
    prev_score DECIMAL;
BEGIN
    SELECT MAX(new_score) INTO prev_score
    FROM Retake
    WHERE student_id = NEW.student_id
      AND discipline_id = NEW.discipline_id
      AND attempt_number < NEW.attempt_number;

    IF prev_score IS NOT NULL AND NEW.new_score < prev_score THEN
        RAISE EXCEPTION 'New score cannot be lower than previous score';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_check_retake_score
BEFORE INSERT OR UPDATE ON Retake
FOR EACH ROW
EXECUTE FUNCTION check_retake_score();
```

**Таблица аудита**
```sql
CREATE TABLE Grade_Audit (
    audit_id SERIAL PRIMARY KEY,
    grade_id INT,
    old_score DECIMAL(5,2),
    new_score DECIMAL(5,2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_grade_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Grade_Audit (
        grade_id,
        old_score,
        new_score,
        operation_type
    )
    VALUES (
        NEW.grade_id,
        OLD.score,
        NEW.score,
        TG_OP
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_grade_change
AFTER UPDATE ON Grade
FOR EACH ROW
EXECUTE FUNCTION audit_grade_change();
```

### 6. Сложный SQL-запрос
Вывести средний балл студентов по группам и дисциплинам, количество оценок.
```sql
SELECT
    g.name AS group_name,
    d.name AS discipline,
    ROUND(AVG(gr.score), 2) AS avg_score,
    COUNT(gr.grade_id) AS grade_count

FROM "Group" g

JOIN Student s
    ON g.group_id = s.group_id

JOIN Grade gr
    ON s.student_id = gr.student_id

JOIN Lesson l
    ON gr.lesson_id = l.lesson_id

JOIN Discipline d
    ON l.discipline_id = d.discipline_id

GROUP BY
    g.group_id,
    g.name,
    d.discipline_id,
    d.name

ORDER BY avg_score DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=journal_db");
        conn.Open();

        // 1. CREATE TABLE (см. SQL: DDL)
        Execute(conn, SQL.CreateTables);

        // 2. INSERT DATA (см. SQL: заполнение таблиц)
        Execute(conn, SQL.InsertData);

        // 3. UPDATE / DELETE (см. SQL: DML операции)
        Execute(conn, SQL.ModifyData);

        // 4. SELECT (см. SQL: аналитический запрос)
        ExecuteQuery(conn, SQL.ReportQuery);

        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            Console.WriteLine(reader[0]);
        }
    }
}
```

## Вариант 4. Расписание аудиторий и занятий
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Аудитория (id, номер, этаж, вместимость, тип, проектор)
- Корпус (id, название, адрес, телефон)
- Группа (id, название, курс, факультет, кол_студентов)
- Преподаватель (id, фио, email, телефон, кафедра, ставка)
- Дисциплина (id, название, код, часы_всего, семестр)
- Временной_слот (id, день_недели, время_начала, время_конца, номер_пары)
- Тип_занятия (id, название, цвет)
- Бронирование (id, дата, статус, причина)

**Связи:**
- Корпус (1) содержит (0..M) Аудитория
- Аудитория (1) участвует (0..M) Бронирование
- Временной_слот (1) участвует (0..M) Бронирование
- Группа (0..M) участвует (0..M) Бронирование
- Преподаватель (0..M) участвует (0..M) Бронирование
- Дисциплина (0..M) участвует (0..M) Бронирование
- Тип_занятия (0..M) участвует (0..M) Бронирование
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Building(building_id PK, name, address, phone),
Auditorium(auditorium_id PK, room_number, floor, capacity, room_type, has_projector, building_id FK),
LessonType(lesson_type_id PK, name, display_color),
Timeslot(timeslot_id PK, day_of_week, start_time, end_time, pair_number),
Booking(booking_id PK, book_date, status, reason, auditorium_id FK, timeslot_id FK, group_id FK, teacher_id FK, discipline_id FK, lesson_type_id FK),
Group(group_id PK, name, course, faculty, student_count),
Teacher(teacher_id PK, full_name, email UK, phone, department),
Discipline(discipline_id PK, name, code UK, total_hours, semester).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, building_id функционально определяет название корпуса и адрес, auditorium_id определяет характеристики аудитории и её корпус, booking_id определяет данные бронирования и его внешние ключи. Все таблицы имеют простые первичные ключи, поэтому частичные зависимости отсутствуют.

Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные корпуса не хранятся в Auditorium, а данные группы не хранятся в Booking). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Building (
    building_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20)
);
```

```sql
CREATE TABLE Auditorium (
    auditorium_id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL,
    floor INT CHECK (floor >= 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    room_type VARCHAR(100),
    has_projector BOOLEAN DEFAULT FALSE,
    building_id INT NOT NULL,

    FOREIGN KEY (building_id) REFERENCES Building(building_id)
);
```

```sql
CREATE TABLE LessonType (
    lesson_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_color VARCHAR(7) DEFAULT '#FFFFFF'
);
```

```sql
CREATE TABLE Timeslot (
    timeslot_id SERIAL PRIMARY KEY,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    pair_number INT CHECK (pair_number > 0)
);
```

```sql
CREATE TABLE "Group" (
    group_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    course INT CHECK (course BETWEEN 1 AND 6) NOT NULL,
    faculty VARCHAR(200) NOT NULL,
    student_count INT DEFAULT 0
);
```

```sql
CREATE TABLE Teacher (
    teacher_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(200) NOT NULL
);
```

```sql
CREATE TABLE Discipline (
    discipline_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    total_hours INT CHECK (total_hours > 0),
    semester INT CHECK (semester BETWEEN 1 AND 12) NOT NULL
);
```

```sql
CREATE TABLE Booking (
    booking_id SERIAL PRIMARY KEY,
    book_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    reason TEXT,
    auditorium_id INT NOT NULL,
    timeslot_id INT NOT NULL,
    group_id INT,
    teacher_id INT,
    discipline_id INT,
    lesson_type_id INT,

    FOREIGN KEY (auditorium_id) REFERENCES Auditorium(auditorium_id),
    FOREIGN KEY (timeslot_id) REFERENCES Timeslot(timeslot_id),
    FOREIGN KEY (group_id) REFERENCES "Group"(group_id),
    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id),
    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id),
    FOREIGN KEY (lesson_type_id) REFERENCES LessonType(lesson_type_id),

    UNIQUE(auditorium_id, timeslot_id, book_date)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблицы Booking, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_auditorium_building
ON Auditorium(building_id);

CREATE INDEX idx_booking_auditorium
ON Booking(auditorium_id);

CREATE INDEX idx_booking_timeslot
ON Booking(timeslot_id);

CREATE INDEX idx_booking_group
ON Booking(group_id);

CREATE INDEX idx_booking_teacher
ON Booking(teacher_id);
```
### 4. SQL: команды управления данными
**Building**
```sql
INSERT INTO Building (name, address, phone)
VALUES 
('Главный корпус', 'ул. Университетская, 1', '111-111'),
('Учебный корпус Б', 'ул. Университетская, 2', '222-222');
```

```sql
UPDATE Building
SET name = 'Главный корпус (старый)',
    address = 'ул. Университетская, 10',
    phone = '999-999'
WHERE building_id = 1;
```

```sql
DELETE FROM Building
WHERE building_id = 2;
```

**Auditorium**
```sql
INSERT INTO Auditorium (room_number, floor, capacity, room_type, has_projector, building_id)
VALUES 
('101', 1, 100, 'лекционная', TRUE, 1),
('203', 2, 30, 'компьютерная', FALSE, 1);
```

```sql
UPDATE Auditorium
SET room_number = '201',
    floor = 2,
    capacity = 120,
    room_type = 'лекционная',
    has_projector = TRUE,
    building_id = 1
WHERE auditorium_id = 1;
```

```sql
DELETE FROM Auditorium
WHERE auditorium_id = 2;
```

**LessonType**
```sql
INSERT INTO LessonType (name, display_color)
VALUES 
('Лекция', '#4CAF50'),
('Семинар', '#2196F3'),
('Лабораторная', '#FF9800');
```

```sql
UPDATE LessonType
SET name = 'Лекция (онлайн)',
    display_color = '#66BB6A'
WHERE lesson_type_id = 1;
```

```sql
DELETE FROM LessonType
WHERE lesson_type_id = 3;
```

**Timeslot**
```sql
INSERT INTO Timeslot (day_of_week, start_time, end_time, pair_number)
VALUES 
(1, '08:00', '09:30', 1),
(1, '09:45', '11:15', 2);
```

```sql
UPDATE Timeslot
SET day_of_week = 2,
    start_time = '10:00',
    end_time = '11:30',
    pair_number = 3
WHERE timeslot_id = 1;
```

```sql
DELETE FROM Timeslot
WHERE timeslot_id = 2;
```

**Group**
```sql
INSERT INTO "Group" (name, course, faculty, student_count)
VALUES 
('ИС-21', 2, 'ФИнИТ', 25),
('ИС-22', 2, 'ФИнИТ', 28);
```

```sql
UPDATE "Group"
SET name = 'ИС-31',
    course = 3,
    faculty = 'ФИнИТ',
    student_count = 30
WHERE group_id = 1;
```

```sql
DELETE FROM "Group"
WHERE group_id = 2;
```

**Teacher**
```sql
INSERT INTO Teacher (full_name, email, phone, department)
VALUES 
('проф. Иванов И.И.', 'ivanov@university.ru', '111-111', 'Кафедра математики'),
('доц. Петрова А.С.', 'petrova@university.ru', '222-222', 'Кафедра информатики');
```

```sql
UPDATE Teacher
SET full_name = 'проф. Иванов Иван',
    email = 'ivan@newmail.ru',
    phone = '999-999',
    department = 'Кафедра математики'
WHERE teacher_id = 1;
```

```sql
DELETE FROM Teacher
WHERE teacher_id = 2;
```

**Discipline**
```sql
INSERT INTO Discipline (name, code, total_hours, semester)
VALUES 
('Математический анализ', 'Б1.О.01', 128, 1),
('Программирование', 'Б1.О.02', 96, 1);
```

```sql
UPDATE Discipline
SET name = 'Матанализ',
    code = 'Б1.О.01',
    total_hours = 144,
    semester = 1
WHERE discipline_id = 1;
```

```sql
DELETE FROM Discipline
WHERE discipline_id = 2;
```

**Booking**
```sql
INSERT INTO Booking (book_date, status, auditorium_id, timeslot_id, group_id, teacher_id, discipline_id, lesson_type_id)
VALUES 
('2024-09-02', 'confirmed', 1, 1, 1, 1, 1, 1),
('2024-09-02', 'confirmed', 1, 2, 1, 1, 1, 2);
```

```sql
UPDATE Booking
SET book_date = '2024-09-03',
    status = 'cancelled',
    reason = 'Замена расписания',
    auditorium_id = 1,
    timeslot_id = 1,
    group_id = 1,
    teacher_id = 1,
    discipline_id = 1,
    lesson_type_id = 1
WHERE booking_id = 1;
```

```sql
DELETE FROM Booking
WHERE booking_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Нельзя забронировать аудиторию, если она уже занята в этот день и временной слот. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется проверка по другой строке той же таблицы)
```sql
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM Booking b
        WHERE b.auditorium_id = NEW.auditorium_id
          AND b.timeslot_id = NEW.timeslot_id
          AND b.book_date = NEW.book_date
          AND b.status = 'confirmed'
          AND b.booking_id != NEW.booking_id
    ) THEN
        RAISE EXCEPTION 'Auditorium is already booked for this timeslot';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_check_booking_overlap
BEFORE INSERT OR UPDATE ON Booking
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION check_booking_overlap();
```

**Таблица аудита**
```sql
CREATE TABLE Booking_Audit (
    audit_id SERIAL PRIMARY KEY,
    booking_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_booking_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Booking_Audit (
        booking_id,
        old_status,
        new_status,
        operation_type
    )
    VALUES (
        NEW.booking_id,
        OLD.status,
        NEW.status,
        TG_OP
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_booking_status
AFTER UPDATE ON Booking
FOR EACH ROW
EXECUTE FUNCTION audit_booking_status();
```

### 6. Сложный SQL-запрос
Вывести расписание на день: аудитория, время, группа, преподаватель, дисциплина, тип занятия.
```sql
SELECT
    b.name AS building,
    a.room_number AS auditorium,
    t.start_time,
    t.end_time,
    g.name AS group_name,
    tc.full_name AS teacher,
    d.name AS discipline,
    lt.name AS lesson_type

FROM Booking bk

JOIN Auditorium a
    ON bk.auditorium_id = a.auditorium_id

JOIN Building b
    ON a.building_id = b.building_id

JOIN Timeslot t
    ON bk.timeslot_id = t.timeslot_id

LEFT JOIN "Group" g
    ON bk.group_id = g.group_id

LEFT JOIN Teacher tc
    ON bk.teacher_id = tc.teacher_id

LEFT JOIN Discipline d
    ON bk.discipline_id = d.discipline_id

LEFT JOIN LessonType lt
    ON bk.lesson_type_id = lt.lesson_type_id

WHERE bk.book_date = '2024-09-02'
  AND bk.status = 'confirmed'

ORDER BY t.start_time;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=schedule_db");
        conn.Open();

        // 1. CREATE TABLE (см. SQL: DDL)
        Execute(conn, SQL.CreateTables);

        // 2. INSERT DATA (см. SQL: заполнение таблиц)
        Execute(conn, SQL.InsertData);

        // 3. UPDATE / DELETE (см. SQL: DML операции)
        Execute(conn, SQL.ModifyData);

        // 4. SELECT (см. SQL: аналитический запрос)
        ExecuteQuery(conn, SQL.ReportQuery);

        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            Console.WriteLine(reader[0]);
        }
    }
}
```

## Вариант 5. Библиотечный учёт
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Книга (id, isbn, название, год_издания, кол_страниц, аннотация)
- Автор (id, фио, дата_рождения, страна, биография)
- Экземпляр (id, инвентарный_номер, дата_поступления, состояние, цена)
- Читатель (id, фио, email, телефон, адрес, дата_регистрации)
- Выдача (id, дата_выдачи, дата_возврата_план, дата_возврата_факт)
- Штраф (id, сумма, дата_начисления, оплачен, причина)
- Категория (id, название, возрастное_ограничение, льготный_период)

**Связи:**
- Книга (0..M) имеет (0..M) Автор
- Книга (1) включает (0..M) Экземпляр
- Экземпляр (1) участвует (0..M) Выдача
- Читатель (1) совершает (0..M) Выдача
- Читатель (0..M) относится (1) Категория
- Выдача (1) порождает (0..1) Штраф
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Category(category_id PK, name UK, age_restriction, grace_days),
Author(author_id PK, full_name, birth_date, country, biography),
Book(book_id PK, isbn UK, title, publish_year, page_count, annotation, category_id FK),
BookAuthor(book_id PK FK, author_id PK FK, author_order),
BookCopy(copy_id PK, inventory_number UK, receipt_date, condition, price, book_id FK),
Reader(reader_id PK, full_name, email UK, phone, address, registration_date, category_id FK),
Checkout(checkout_id PK, checkout_date, due_date, return_date, copy_id FK, reader_id FK),
Fine(fine_id PK, amount, accrual_date, paid, reason, checkout_id UK FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность BookAuthor.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, book_id функционально определяет данные книги и её категорию, reader_id определяет данные читателя и его категорию. В связующей сущности BookAuthor составной ключ (book_id, author_id) определяет только порядок автора и не определяет данные исходных сущностей.

Проверка второй нормальной формы показывает отсутствие частичных функциональных зависимостей. Единственной сущностью с составным ключом является BookAuthor, и все её неключевые атрибуты зависят от полного ключа (book_id, author_id). Отсутствуют зависимости вида book_id → author_order или author_id → author_order, что исключает нарушение 2НФ. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные категории не хранятся в Book, а данные автора не дублируются в BookCopy). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    age_restriction INT DEFAULT 0,
    grace_days INT DEFAULT 0
);
```

```sql
CREATE TABLE Author (
    author_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    country VARCHAR(100),
    biography TEXT
);
```

```sql
CREATE TABLE Book (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    publish_year INT CHECK (publish_year > 0),
    page_count INT CHECK (page_count > 0),
    annotation TEXT,
    category_id INT,

    FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
```

```sql
CREATE TABLE BookAuthor (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    author_order INT CHECK (author_order > 0),

    PRIMARY KEY (book_id, author_id),

    FOREIGN KEY (book_id) REFERENCES Book(book_id),
    FOREIGN KEY (author_id) REFERENCES Author(author_id)
);
```

```sql
CREATE TABLE BookCopy (
    copy_id SERIAL PRIMARY KEY,
    inventory_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE DEFAULT CURRENT_DATE,
    condition VARCHAR(50) DEFAULT 'good',
    price DECIMAL(10,2) CHECK (price >= 0),
    book_id INT NOT NULL,

    FOREIGN KEY (book_id) REFERENCES Book(book_id)
);
```

```sql
CREATE TABLE Reader (
    reader_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    category_id INT,

    FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
```

```sql
CREATE TABLE Checkout (
    checkout_id SERIAL PRIMARY KEY,
    checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    copy_id INT NOT NULL,
    reader_id INT NOT NULL,

    FOREIGN KEY (copy_id) REFERENCES BookCopy(copy_id),
    FOREIGN KEY (reader_id) REFERENCES Reader(reader_id)
);
```

```sql
CREATE TABLE Fine (
    fine_id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    accrual_date DATE DEFAULT CURRENT_DATE,
    paid BOOLEAN DEFAULT FALSE,
    reason VARCHAR(500),
    checkout_id INT NOT NULL UNIQUE,

    FOREIGN KEY (checkout_id) REFERENCES Checkout(checkout_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблиц BookCopy, Checkout и Fine, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_book_category
ON Book(category_id);

CREATE INDEX idx_copy_book
ON BookCopy(book_id);

CREATE INDEX idx_checkout_copy
ON Checkout(copy_id);

CREATE INDEX idx_checkout_reader
ON Checkout(reader_id);
```
### 4. SQL: команды управления данными
**Category**
```sql
INSERT INTO Category (name, age_restriction, grace_days)
VALUES ('Художественная', 0, 5),
       ('Учебная', 0, 10);
```

```sql
UPDATE Category
SET name = 'Художественная литература',
    age_restriction = 6,
    grace_days = 7
WHERE category_id = 1;
```

```sql
DELETE FROM Category WHERE category_id = 2;
```

**Author**
```sql
INSERT INTO Author (full_name, country, biography)
VALUES ('Лев Толстой', 'Россия', 'Великий русский писатель'),
       ('Фёдор Достоевский', 'Россия', 'Русский писатель и мыслитель');
```

```sql
UPDATE Author
SET full_name = 'Л.Н. Толстой',
    birth_date = '1828-09-09',
    country = 'Россия',
    biography = 'Автор Войны и мира'
WHERE author_id = 1;
```

```sql
DELETE FROM Author WHERE author_id = 2;
```

**Book**
```sql
INSERT INTO Book (isbn, title, publish_year, page_count, category_id)
VALUES ('978-5-04-00001-1', 'Война и мир', 1869, 1300, 1),
       ('978-5-04-00002-8', 'Преступление и наказание', 1866, 672, 1);
```

```sql
UPDATE Book
SET isbn = '978-5-04-00001-2',
    title = 'Война и мир (том 1)',
    publish_year = 1869,
    page_count = 1225,
    annotation = 'Роман-эпопея',
    category_id = 1
WHERE book_id = 1;
```

```sql
DELETE FROM Book WHERE book_id = 2;
```

**BookAuthor**
```sql
INSERT INTO BookAuthor (book_id, author_id, author_order)
VALUES (1, 1, 1),
       (2, 2, 1);
```

```sql
DELETE FROM BookAuthor WHERE book_id = 2 AND author_id = 2;
```

**BookCopy**
```sql
INSERT INTO BookCopy (inventory_number, receipt_date, condition, price, book_id)
VALUES ('INV-001', '2020-01-15', 'good', 500, 1),
       ('INV-002', '2021-06-01', 'new', 1200, 1);
```

```sql
UPDATE BookCopy
SET inventory_number = 'INV-999',
    receipt_date = '2022-01-01',
    condition = 'fair',
    price = 400,
    book_id = 1
WHERE copy_id = 1;
```

```sql
DELETE FROM BookCopy WHERE copy_id = 2;
```

**Reader**
```sql
INSERT INTO Reader (full_name, email, phone, category_id)
VALUES ('Иванов Иван', 'ivan@mail.ru', '111-111', 1),
       ('Петрова Анна', 'anna@mail.ru', '222-222', 1);
```

```sql
UPDATE Reader
SET full_name = 'Иванов Пётр',
    email = 'petr@mail.ru',
    phone = '333-333',
    address = 'ул. Ленина, 1',
    category_id = 1
WHERE reader_id = 1;
```

```sql
DELETE FROM Reader WHERE reader_id = 2;
```

**Checkout**
```sql
INSERT INTO Checkout (checkout_date, due_date, copy_id, reader_id)
VALUES ('2024-09-01', '2024-09-15', 1, 1),
       ('2024-09-05', '2024-09-19', 2, 1);
```

```sql
UPDATE Checkout
SET checkout_date = '2024-09-10',
    due_date = '2024-09-24',
    return_date = '2024-09-20',
    copy_id = 1,
    reader_id = 1
WHERE checkout_id = 1;
```

```sql
DELETE FROM Checkout WHERE checkout_id = 2;
```

**Fine**
```sql
INSERT INTO Fine (amount, accrual_date, paid, reason, checkout_id)
VALUES (150, '2024-09-20', FALSE, 'Просрочка 5 дней', 1),
       (300, '2024-09-25', FALSE, 'Просрочка 10 дней', 2);
```

```sql
UPDATE Fine
SET amount = 200,
    accrual_date = '2024-09-21',
    paid = TRUE,
    reason = 'Оплачено'
WHERE fine_id = 1;
```

```sql
DELETE FROM Fine WHERE fine_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматический расчёт штрафа при возврате книги с просрочкой. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется вычисление на основе разницы дат)
```sql
CREATE OR REPLACE FUNCTION auto_fine_on_return()
RETURNS TRIGGER AS $$
DECLARE
    days_overdue INT;
BEGIN
    IF NEW.return_date IS NOT NULL AND NEW.return_date > NEW.due_date THEN
        days_overdue := NEW.return_date - NEW.due_date;

        IF NOT EXISTS (SELECT 1 FROM Fine WHERE checkout_id = NEW.checkout_id) THEN
            INSERT INTO Fine (amount, reason, checkout_id)
            VALUES (days_overdue * 30, 'Просрочка ' || days_overdue || ' дн.', NEW.checkout_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_auto_fine_on_return
AFTER UPDATE ON Checkout
FOR EACH ROW
WHEN (OLD.return_date IS NULL AND NEW.return_date IS NOT NULL)
EXECUTE FUNCTION auto_fine_on_return();
```

**Таблица аудита**
```sql
CREATE TABLE Checkout_Audit (
    audit_id SERIAL PRIMARY KEY,
    checkout_id INT,
    old_return_date DATE,
    new_return_date DATE,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_checkout_return()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Checkout_Audit (
        checkout_id,
        old_return_date,
        new_return_date,
        operation_type
    )
    VALUES (
        NEW.checkout_id,
        OLD.return_date,
        NEW.return_date,
        TG_OP
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_checkout_return
AFTER UPDATE ON Checkout
FOR EACH ROW
WHEN (OLD.return_date IS DISTINCT FROM NEW.return_date)
EXECUTE FUNCTION audit_checkout_return();
```

### 6. Сложный SQL-запрос
Вывести читателей с просроченными книгами, количеством просрочек и суммой штрафов.
```sql
SELECT
    r.full_name AS reader,
    COUNT(c.checkout_id) AS overdue_count,
    SUM(CURRENT_DATE - c.due_date) AS total_days,
    COALESCE(SUM(f.amount), 0) AS total_fine

FROM Reader r

JOIN Checkout c
    ON r.reader_id = c.reader_id

LEFT JOIN Fine f
    ON c.checkout_id = f.checkout_id

WHERE c.return_date IS NULL
  AND c.due_date < CURRENT_DATE

GROUP BY
    r.reader_id,
    r.full_name

HAVING COUNT(c.checkout_id) > 0

ORDER BY total_days DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=library_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 6. Склад товаров и заказов
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Поставщик (id, название, инн, контактное_лицо, телефон, email)
- Товар (id, артикул, название, единица_измерения, цена_закупки, цена_продажи, остаток)
- Заказ_поставщику (id, номер, дата_заказа, дата_поставки, статус, сумма)
- Позиция_заказа (id, количество, цена_факт)
- Категория_товара (id, название, описание, ндс)
- Накладная (id, номер, дата, тип, статус, сумма)
- Склад (id, название, адрес, ответственный)

**Связи:**
- Поставщик (1) оформляет (0..M) Заказ_поставщику
- Заказ_поставщику (1) включает (0..M) Позиция_заказа
- Товар (0..M) относится (1) Категория_товара
- Товар (0..M) участвует (0..M) Позиция_заказа
- Заказ_поставщику (0..1) сопровождается (0..1) Накладная
- Товар (0..M) хранится (1) Склад
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Supplier(supplier_id PK, name, inn UK, contact_person, phone, email),
Category(category_id PK, name, description, vat_rate),
Product(product_id PK, article UK, name, unit, purchase_price, sale_price, stock_quantity, category_id FK, warehouse_id FK),
Warehouse(warehouse_id PK, name, address, responsible),
PurchaseOrder(order_id PK, order_number UK, order_date, delivery_date, status, total_amount, supplier_id FK),
OrderItem(order_item_id PK, quantity, actual_price, order_id FK, product_id FK),
Invoice(invoice_id PK, number UK, invoice_date, type, status, amount, order_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность OrderItem.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, supplier_id функционально определяет название и контактные данные поставщика, product_id определяет характеристики товара и его категорию/склад. Связующая таблица OrderItem имеет собственный первичный ключ order_item_id, что исключает частичные зависимости.

Проверка второй и третьей нормальных форм подтверждает отсутствие частичных и транзитивных зависимостей. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные поставщика не хранятся в PurchaseOrder, а данные категории не дублируются в Product). Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Supplier (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    inn VARCHAR(12) NOT NULL UNIQUE,
    contact_person VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100)
);
```

```sql
CREATE TABLE Category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    vat_rate DECIMAL(4,2) DEFAULT 20
);
```

```sql
CREATE TABLE Warehouse (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    address TEXT,
    responsible VARCHAR(200)
);
```

```sql
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    article VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    unit VARCHAR(20) DEFAULT 'шт',
    purchase_price DECIMAL(12,2) CHECK (purchase_price >= 0),
    sale_price DECIMAL(12,2) CHECK (sale_price >= 0),
    stock_quantity INT DEFAULT 0,
    category_id INT,
    warehouse_id INT,

    FOREIGN KEY (category_id) REFERENCES Category(category_id),
    FOREIGN KEY (warehouse_id) REFERENCES Warehouse(warehouse_id)
);
```

```sql
CREATE TABLE PurchaseOrder (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'new',
    total_amount DECIMAL(14,2) DEFAULT 0,
    supplier_id INT NOT NULL,

    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id)
);
```

```sql
CREATE TABLE OrderItem (
    order_item_id SERIAL PRIMARY KEY,
    quantity INT NOT NULL CHECK (quantity > 0),
    actual_price DECIMAL(12,2),
    order_id INT NOT NULL,
    product_id INT NOT NULL,

    FOREIGN KEY (order_id) REFERENCES PurchaseOrder(order_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);
```

```sql
CREATE TABLE Invoice (
    invoice_id SERIAL PRIMARY KEY,
    number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(50) DEFAULT 'incoming',
    status VARCHAR(50) DEFAULT 'pending',
    amount DECIMAL(14,2) DEFAULT 0,
    order_id INT NOT NULL,

    FOREIGN KEY (order_id) REFERENCES PurchaseOrder(order_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Особенно это важно для таблиц Product, PurchaseOrder, OrderItem и Invoice, где часто выполняются выборки по связанным сущностям. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_product_category
ON Product(category_id);

CREATE INDEX idx_product_warehouse
ON Product(warehouse_id);

CREATE INDEX idx_order_supplier
ON PurchaseOrder(supplier_id);

CREATE INDEX idx_orderitem_order
ON OrderItem(order_id);

CREATE INDEX idx_orderitem_product
ON OrderItem(product_id);

CREATE INDEX idx_invoice_order
ON Invoice(order_id);
```
### 4. SQL: команды управления данными
**Supplier**
```sql
INSERT INTO Supplier (name, inn, phone, email)
VALUES ('ООО Поставщик', '7701234567', '111-111', 'info@supplier.ru'),
       ('АО Торговый Дом', '7707654321', '222-222', 'info@tdom.ru');
```

```sql
UPDATE Supplier
SET name = 'ООО ГлавПоставщик',
    inn = '7701234567',
    contact_person = 'Иванов И.И.',
    phone = '999-999',
    email = 'glav@supplier.ru'
WHERE supplier_id = 1;
```

```sql
DELETE FROM Supplier WHERE supplier_id = 2;
```

**Category**
```sql
INSERT INTO Category (name, vat_rate)
VALUES ('Электроника', 20),
       ('Канцтовары', 10);
```

```sql
UPDATE Category
SET name = 'Бытовая электроника',
    description = 'Товары для дома',
    vat_rate = 20
WHERE category_id = 1;
```

```sql
DELETE FROM Category WHERE category_id = 2;
```

**Warehouse**
```sql
INSERT INTO Warehouse (name, address, responsible)
VALUES ('Центральный склад', 'ул. Складская, 1', 'Петров П.А.'),
       ('Резервный склад', 'ул. Запасная, 5', 'Сидоров С.С.');
```

```sql
UPDATE Warehouse
SET name = 'Главный склад',
    address = 'ул. Складская, 10',
    responsible = 'Петров П.П.'
WHERE warehouse_id = 1;
```

```sql
DELETE FROM Warehouse WHERE warehouse_id = 2;
```

**Product**
```sql
INSERT INTO Product (article, name, purchase_price, sale_price, stock_quantity, category_id, warehouse_id)
VALUES ('ART-001', 'Монитор 24"', 12000, 18000, 50, 1, 1),
       ('ART-002', 'Клавиатура USB', 800, 1500, 100, 1, 1);
```

```sql
UPDATE Product
SET article = 'ART-001-Н',
    name = 'Монитор 27"',
    purchase_price = 15000,
    sale_price = 22000,
    stock_quantity = 30,
    category_id = 1,
    warehouse_id = 1
WHERE product_id = 1;
```

```sql
DELETE FROM Product WHERE product_id = 2;
```

**PurchaseOrder**
```sql
INSERT INTO PurchaseOrder (order_number, order_date, delivery_date, status, supplier_id)
VALUES ('PO-0001', '2024-09-01', '2024-09-10', 'delivered', 1),
       ('PO-0002', '2024-09-05', '2024-09-15', 'pending', 1);
```

```sql
UPDATE PurchaseOrder
SET order_number = 'PO-0001-ИЗМ',
    order_date = '2024-09-02',
    delivery_date = '2024-09-12',
    status = 'pending',
    supplier_id = 1
WHERE order_id = 1;
```

```sql
DELETE FROM PurchaseOrder WHERE order_id = 2;
```

**OrderItem**
```sql
INSERT INTO OrderItem (quantity, actual_price, order_id, product_id)
VALUES (10, 12000, 1, 1),
       (20, 800, 1, 2);
```

```sql
UPDATE OrderItem
SET quantity = 15,
    actual_price = 11000,
    product_id = 1
WHERE order_item_id = 1;
```

```sql
DELETE FROM OrderItem WHERE order_item_id = 2;
```

**Invoice**
```sql
INSERT INTO Invoice (number, invoice_date, type, status, amount, order_id)
VALUES ('INV-001', '2024-09-11', 'incoming', 'paid', 136000, 1),
       ('INV-002', '2024-09-15', 'incoming', 'pending', 16000, 2);
```

```sql
UPDATE Invoice
SET number = 'INV-001-ИЗМ',
    invoice_date = '2024-09-12',
    type = 'incoming',
    status = 'paid',
    amount = 150000,
    order_id = 1
WHERE invoice_id = 1;
```

```sql
DELETE FROM Invoice WHERE invoice_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматическое обновление остатка товара при изменении статуса заказа на «delivered». (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется изменение данных другой таблицы)
```sql
CREATE OR REPLACE FUNCTION update_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
        UPDATE Product p
        SET stock_quantity = p.stock_quantity + oi.quantity
        FROM OrderItem oi
        WHERE oi.order_id = NEW.order_id
          AND p.product_id = oi.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_update_stock_on_delivery
AFTER UPDATE ON PurchaseOrder
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_delivery();
```

**Таблица аудита**
```sql
CREATE TABLE PurchaseOrder_Audit (
    audit_id SERIAL PRIMARY KEY,
    order_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_order_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO PurchaseOrder_Audit (
        order_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.order_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_order_status
AFTER UPDATE ON PurchaseOrder
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_order_status();
```

### 6. Сложный SQL-запрос
Отчёт по заказам поставщиков: сумма заказа, количество позиций, статус накладной.
```sql
SELECT
    s.name AS supplier,
    po.order_number,
    po.order_date,
    po.status,
    COUNT(oi.order_item_id) AS items_count,
    SUM(oi.quantity * oi.actual_price) AS computed_total,
    i.number AS invoice_number,
    i.status AS invoice_status

FROM PurchaseOrder po

JOIN Supplier s
    ON po.supplier_id = s.supplier_id

LEFT JOIN OrderItem oi
    ON po.order_id = oi.order_id

LEFT JOIN Invoice i
    ON po.order_id = i.order_id

WHERE po.order_date >= '2024-09-01'

GROUP BY
    s.name,
    po.order_id,
    po.order_number,
    po.order_date,
    po.status,
    i.number,
    i.status

ORDER BY po.order_date DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=warehouse_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 7. Управление проектами
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Проект (id, название, код, дата_начала, дата_окончания, бюджет, статус)
- Сотрудник (id, табельный_номер, фио, должность, email, телефон, дата_приёма)
- Отдел (id, название, телефон, этаж)
- Задача (id, название, описание, приоритет, статус, плановая_трудоёмкость, факт_трудоёмкость)
- Временной_отчёт (id, дата, часы, описание_работы)
- Роль_в_проекте (id, название, почасовая_ставка)
- Веха (id, название, дата_планов, дата_факт, статус, описание)

**Связи:**
- Сотрудник (0..M) относится (1) Отдел
- Сотрудник (0..M) участвует (0..M) Проект
- Проект (1) содержит (0..M) Задача
- Задача (1) назначается (0..M) Сотрудник
- Сотрудник (0..M) составляет (0..M) Временной_отчёт
- Задача (0..M) содержит (0..M) Временной_отчёт
- Проект (1) содержит (0..M) Веха
- Сотрудник (0..M) имеет (0..M) Роль_в_проекте
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Department(department_id PK, name, phone, floor),
Employee(employee_id PK, personnel_number UK, full_name, position, email, phone UK, hire_date, department_id FK),
Project(project_id PK, name, code UK, start_date, end_date, budget, status),
ProjectRole(project_role_id PK, name, hourly_rate),
ProjectAssignment(assignment_id PK, employee_id FK, project_id FK, project_role_id FK, start_date, end_date, UNIQUE(employee_id, project_id)),
Milestone(milestone_id PK, name, planned_date, actual_date, status, description, project_id FK),
Task(task_id PK, name, description, priority, status, planned_hours, actual_hours, project_id FK, assignee_id FK),
TimeReport(report_id PK, report_date, hours, description, employee_id FK, task_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативные сущности ProjectAssignment (Сотрудник-Проект) и ссылку на сотрудника в Задаче.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, employee_id функционально определяет данные сотрудника и его отдел, project_id определяет параметры проекта. Ассоциативные таблицы имеют собственные первичные ключи, что исключает частичные зависимости.

Проверка второй и третьей нормальных форм подтверждает отсутствие частичных и транзитивных зависимостей. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы. Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Department (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(20),
    floor INT
);
```

```sql
CREATE TABLE Employee (
    employee_id SERIAL PRIMARY KEY,
    personnel_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    hire_date DATE DEFAULT CURRENT_DATE,
    department_id INT,

    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);
```

```sql
CREATE TABLE Project (
    project_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(14,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planning'
);
```

```sql
CREATE TABLE ProjectRole (
    project_role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate > 0)
);
```

```sql
CREATE TABLE ProjectAssignment (
    assignment_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    project_id INT NOT NULL,
    project_role_id INT,
    start_date DATE,
    end_date DATE,

    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (project_role_id) REFERENCES ProjectRole(project_role_id),

    UNIQUE (employee_id, project_id)
);
```

```sql
CREATE TABLE Milestone (
    milestone_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    planned_date DATE,
    actual_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    project_id INT NOT NULL,

    FOREIGN KEY (project_id) REFERENCES Project(project_id)
);
```

```sql
CREATE TABLE Task (
    task_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    priority INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'new',
    planned_hours DECIMAL(8,2) DEFAULT 0,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    project_id INT NOT NULL,
    assignee_id INT,

    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (assignee_id) REFERENCES Employee(employee_id)
);
```

```sql
CREATE TABLE TimeReport (
    report_id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(6,2) NOT NULL CHECK (hours > 0),
    description TEXT,
    employee_id INT NOT NULL,
    task_id INT NOT NULL,

    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    FOREIGN KEY (task_id) REFERENCES Task(task_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_employee_department
ON Employee(department_id);

CREATE INDEX idx_assignment_employee
ON ProjectAssignment(employee_id);

CREATE INDEX idx_assignment_project
ON ProjectAssignment(project_id);

CREATE INDEX idx_milestone_project
ON Milestone(project_id);

CREATE INDEX idx_task_project
ON Task(project_id);

CREATE INDEX idx_task_assignee
ON Task(assignee_id);

CREATE INDEX idx_timereport_employee
ON TimeReport(employee_id);

CREATE INDEX idx_timereport_task
ON TimeReport(task_id);
```
### 4. SQL: команды управления данными
**Department**
```sql
INSERT INTO Department (name, phone, floor)
VALUES ('Разработка ПО', '111-111', 3),
       ('Тестирование', '222-222', 2);
```

```sql
UPDATE Department
SET name = 'Отдел разработки',
    phone = '333-333',
    floor = 4
WHERE department_id = 1;
```

```sql
DELETE FROM Department WHERE department_id = 2;
```

**Employee**
```sql
INSERT INTO Employee (personnel_number, full_name, position, email, phone, department_id)
VALUES ('EMP-001', 'Иванов Иван', 'Senior Developer', 'ivanov@mail.ru', '111-111', 1),
       ('EMP-002', 'Петрова Анна', 'Tester', 'petrova@mail.ru', '222-222', 2);
```

```sql
UPDATE Employee
SET personnel_number = 'EMP-001-Н',
    full_name = 'Иванов И.И.',
    position = 'Lead Developer',
    email = 'ivanov_new@mail.ru',
    phone = '999-999',
    department_id = 1
WHERE employee_id = 1;
```

```sql
DELETE FROM Employee WHERE employee_id = 2;
```

**Project**
```sql
INSERT INTO Project (name, code, start_date, end_date, budget, status)
VALUES ('Разработка CRM', 'CRM-2024', '2024-01-01', '2024-12-31', 5000000, 'active'),
       ('Миграция БД', 'MIG-2024', '2024-06-01', '2024-09-30', 1500000, 'planning');
```

```sql
UPDATE Project
SET name = 'Разработка CRM-2',
    code = 'CRM-2025',
    start_date = '2025-01-01',
    end_date = '2025-12-31',
    budget = 6000000,
    status = 'planning'
WHERE project_id = 1;
```

```sql
DELETE FROM Project WHERE project_id = 2;
```

**ProjectRole**
```sql
INSERT INTO ProjectRole (name, hourly_rate)
VALUES ('Разработчик', 1500),
       ('Тестировщик', 1000);
```

```sql
UPDATE ProjectRole
SET name = 'Senior Разработчик',
    hourly_rate = 2500
WHERE project_role_id = 1;
```

```sql
DELETE FROM ProjectRole WHERE project_role_id = 2;
```

**ProjectAssignment**
```sql
INSERT INTO ProjectAssignment (employee_id, project_id, project_role_id, start_date)
VALUES (1, 1, 1, '2024-01-01'),
       (2, 1, 2, '2024-06-01');
```

```sql
UPDATE ProjectAssignment
SET project_role_id = 2,
    end_date = '2024-12-31'
WHERE assignment_id = 1;
```

```sql
DELETE FROM ProjectAssignment WHERE assignment_id = 2;
```

**Milestone**
```sql
INSERT INTO Milestone (name, planned_date, status, project_id)
VALUES ('MVP v1.0', '2024-03-01', 'completed', 1),
       ('Релиз v2.0', '2024-09-01', 'pending', 1);
```

```sql
UPDATE Milestone
SET name = 'MVP v2.0',
    planned_date = '2024-04-01',
    actual_date = '2024-04-15',
    status = 'completed',
    description = 'Расширенный функционал',
    project_id = 1
WHERE milestone_id = 1;
```

```sql
DELETE FROM Milestone WHERE milestone_id = 2;
```

**Task**
```sql
INSERT INTO Task (name, description, priority, status, planned_hours, project_id, assignee_id)
VALUES ('Аутентификация', 'Реализовать JWT', 1, 'completed', 80, 1, 1),
       ('UI главной страницы', 'Разработать интерфейс', 2, 'in_progress', 120, 1, 1);
```

```sql
UPDATE Task
SET name = 'Аутентификация (JWT)',
    description = 'Реализовать JWT + OAuth',
    priority = 1,
    status = 'in_progress',
    planned_hours = 100,
    assignee_id = 1
WHERE task_id = 1;
```

```sql
DELETE FROM Task WHERE task_id = 2;
```

**TimeReport**
```sql
INSERT INTO TimeReport (report_date, hours, description, employee_id, task_id)
VALUES ('2024-09-01', 8, 'Разработка JWT', 1, 1),
       ('2024-09-02', 6, 'Документация JWT', 1, 1);
```

```sql
UPDATE TimeReport
SET report_date = '2024-09-03',
    hours = 4,
    description = 'Правки JWT',
    employee_id = 1,
    task_id = 1
WHERE report_id = 1;
```

```sql
DELETE FROM TimeReport WHERE report_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Обновление фактических часов задачи при добавлении временного отчёта. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется агрегация данных другой таблицы)
```sql
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Task
    SET actual_hours = (
        SELECT COALESCE(SUM(hours), 0)
        FROM TimeReport
        WHERE task_id = NEW.task_id
    )
    WHERE task_id = NEW.task_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_update_task_actual_hours
AFTER INSERT OR UPDATE ON TimeReport
FOR EACH ROW
EXECUTE FUNCTION update_task_actual_hours();
```

**Таблица аудита**
```sql
CREATE TABLE Task_Audit (
    audit_id SERIAL PRIMARY KEY,
    task_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_task_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Task_Audit (
        task_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.task_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_task_status
AFTER UPDATE ON Task
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_task_status();
```

### 6. Сложный SQL-запрос
Отчёт по проекту: задачи, исполнители, отработанные часы, статус вех.
```sql
SELECT
    p.name AS project,
    t.name AS task,
    e.full_name AS assignee,
    t.status,
    t.planned_hours,
    t.actual_hours,
    COALESCE(SUM(tr.hours), 0) AS logged_hours,
    COUNT(m.milestone_id) AS total_milestones,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) AS completed_milestones

FROM Project p

LEFT JOIN Task t
    ON p.project_id = t.project_id

LEFT JOIN Employee e
    ON t.assignee_id = e.employee_id

LEFT JOIN TimeReport tr
    ON t.task_id = tr.task_id

LEFT JOIN Milestone m
    ON p.project_id = m.project_id

WHERE p.code = 'CRM-2024'

GROUP BY
    p.project_id,
    p.name,
    t.task_id,
    t.name,
    e.full_name,
    t.status,
    t.planned_hours,
    t.actual_hours

ORDER BY t.name;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=project_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 8. Гостиница
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Клиент (id, фио, дата_рождения, телефон, email, паспорт, адрес)
- Номер (id, номер, этаж, вместимость, цена_за_ночь, категория, описание)
- Бронирование (id, дата_заезда, дата_выезда, дата_бронирования, статус, сумма)
- Услуга (id, название, цена, тип, описание)
- Отель (id, название, адрес, телефон, email, звёздность)
- Сотрудник (id, фио, должность, телефон, email)
- Платёж (id, дата, сумма, способ, статус)

**Связи:**
- Отель (1) содержит (0..M) Номер
- Отель (1) нанимает (0..M) Сотрудник
- Клиент (1) делает (0..M) Бронирование
- Номер (1) участвует (0..M) Бронирование
- Бронирование (1) включает (0..M) Услуга
- Бронирование (1) порождает (0..M) Платёж
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Hotel(hotel_id PK, name, address, phone, email, stars),
Client(client_id PK, full_name, birth_date, phone, email, passport, address),
Employee(employee_id PK, full_name, position, phone, email, hotel_id FK),
Room(room_id PK, room_number, floor, capacity, price_per_night, category, description, hotel_id FK),
Service(service_id PK, name, price, service_type, description),
Booking(booking_id PK, check_in, check_out, booking_date, status, total_amount, client_id FK, room_id FK),
BookingService(booking_id PK FK, service_id PK FK, quantity, price),
Payment(payment_id PK, payment_date, amount, method, status, booking_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность BookingService.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, client_id функционально определяет данные клиента, room_id определяет характеристики номера и отель. Связующая таблица BookingService имеет составной ключ (booking_id, service_id) и неключевые атрибуты (quantity, price), которые зависят от полного ключа.

Проверка второй нормальной формы показывает, что в таблице BookingService все неключевые атрибуты зависят от полного составного ключа, что исключает частичные зависимости. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей — характеристики отеля, клиента и номера вынесены в отдельные таблицы и не дублируются в Booking или Payment.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Hotel (
    hotel_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    stars INT CHECK (stars BETWEEN 1 AND 5)
);
```

```sql
CREATE TABLE Client (
    client_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    passport VARCHAR(20) UNIQUE,
    address TEXT
);
```

```sql
CREATE TABLE Employee (
    employee_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    hotel_id INT NOT NULL,

    FOREIGN KEY (hotel_id) REFERENCES Hotel(hotel_id)
);
```

```sql
CREATE TABLE Room (
    room_id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL,
    floor INT,
    capacity INT CHECK (capacity > 0),
    price_per_night DECIMAL(10,2) CHECK (price_per_night > 0),
    category VARCHAR(100),
    description TEXT,
    hotel_id INT NOT NULL,

    FOREIGN KEY (hotel_id) REFERENCES Hotel(hotel_id)
);
```

```sql
CREATE TABLE Service (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) CHECK (price >= 0),
    service_type VARCHAR(100),
    description TEXT
);
```

```sql
CREATE TABLE Booking (
    booking_id SERIAL PRIMARY KEY,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    booking_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'confirmed',
    total_amount DECIMAL(12,2) DEFAULT 0,
    client_id INT NOT NULL,
    room_id INT NOT NULL,

    FOREIGN KEY (client_id) REFERENCES Client(client_id),
    FOREIGN KEY (room_id) REFERENCES Room(room_id),

    CHECK (check_out > check_in)
);
```

```sql
CREATE TABLE BookingService (
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2),

    PRIMARY KEY (booking_id, service_id),

    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id),
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);
```

```sql
CREATE TABLE Payment (
    payment_id SERIAL PRIMARY KEY,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    booking_id INT NOT NULL,

    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_employee_hotel
ON Employee(hotel_id);

CREATE INDEX idx_room_hotel
ON Room(hotel_id);

CREATE INDEX idx_booking_client
ON Booking(client_id);

CREATE INDEX idx_booking_room
ON Booking(room_id);

CREATE INDEX idx_payment_booking
ON Payment(booking_id);

CREATE INDEX idx_bs_booking
ON BookingService(booking_id);
```
### 4. SQL: команды управления данными
**Hotel**
```sql
INSERT INTO Hotel (name, address, phone, email, stars)
VALUES ('Отель Центральный', 'ул. Ленина, 1', '111-111', 'info@central.ru', 4),
       ('Гостиница Уют', 'ул. Мира, 5', '222-222', 'info@uyut.ru', 3);
```

```sql
UPDATE Hotel
SET name = 'Отель Центральный Люкс',
    phone = '999-999',
    email = 'luxe@central.ru',
    stars = 5
WHERE hotel_id = 1;
```

```sql
DELETE FROM Hotel WHERE hotel_id = 2;
```

**Client**
```sql
INSERT INTO Client (full_name, phone, email, passport)
VALUES ('Иванов Иван Иванович', '111-111', 'ivan@mail.ru', '4000 123456'),
       ('Петрова Анна Сергеевна', '222-222', 'anna@mail.ru', '4000 654321');
```

```sql
UPDATE Client
SET full_name = 'Иванов И.И.',
    phone = '999-999',
    email = 'ivanov@mail.ru',
    passport = '4000 123456'
WHERE client_id = 1;
```

```sql
DELETE FROM Client WHERE client_id = 2;
```

**Employee**
```sql
INSERT INTO Employee (full_name, position, phone, email, hotel_id)
VALUES ('Сидоров Пётр', 'Администратор', '111-111', 'sidorov@central.ru', 1),
       ('Козлова Мария', 'Горничная', '222-222', 'kozlova@central.ru', 1);
```

```sql
UPDATE Employee
SET full_name = 'Сидоров П.П.',
    position = 'Старший администратор',
    phone = '333-333',
    email = 'sidorov_s@central.ru',
    hotel_id = 1
WHERE employee_id = 1;
```

```sql
DELETE FROM Employee WHERE employee_id = 2;
```

**Room**
```sql
INSERT INTO Room (room_number, floor, capacity, price_per_night, category, hotel_id)
VALUES ('101', 1, 1, 3000, 'Стандарт', 1),
       ('201', 2, 2, 5000, 'Люкс', 1);
```

```sql
UPDATE Room
SET room_number = '301',
    floor = 3,
    capacity = 3,
    price_per_night = 7000,
    category = 'Полулюкс',
    description = 'Вид на город',
    hotel_id = 1
WHERE room_id = 1;
```

```sql
DELETE FROM Room WHERE room_id = 2;
```

**Service**
```sql
INSERT INTO Service (name, price, service_type)
VALUES ('Завтрак', 500, 'питание'),
       ('СПА', 2000, 'оздоровление');
```

```sql
UPDATE Service
SET name = 'Завтрак (шведский стол)',
    price = 800,
    service_type = 'питание',
    description = 'Буфет'
WHERE service_id = 1;
```

```sql
DELETE FROM Service WHERE service_id = 2;
```

**Booking**
```sql
INSERT INTO Booking (check_in, check_out, client_id, room_id)
VALUES ('2024-09-01', '2024-09-05', 1, 1),
       ('2024-09-10', '2024-09-12', 1, 2);
```

```sql
UPDATE Booking
SET check_in = '2024-09-02',
    check_out = '2024-09-06',
    status = 'checked_in',
    client_id = 1,
    room_id = 1
WHERE booking_id = 1;
```

```sql
DELETE FROM Booking WHERE booking_id = 2;
```

**BookingService**
```sql
INSERT INTO BookingService (booking_id, service_id, quantity, price)
VALUES (1, 1, 4, 500),
       (1, 2, 1, 2000);
```

```sql
UPDATE BookingService
SET quantity = 5,
    price = 800
WHERE booking_id = 1 AND service_id = 1;
```

```sql
DELETE FROM BookingService WHERE booking_id = 1 AND service_id = 2;
```

**Payment**
```sql
INSERT INTO Payment (payment_date, amount, method, status, booking_id)
VALUES ('2024-09-01', 12000, 'card', 'paid', 1),
       ('2024-09-02', 2000, 'cash', 'paid', 1);
```

```sql
UPDATE Payment
SET payment_date = '2024-09-02',
    amount = 15000,
    method = 'card',
    status = 'paid',
    booking_id = 1
WHERE payment_id = 1;
```

```sql
DELETE FROM Payment WHERE payment_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматический расчёт суммы бронирования при вставке/обновлении услуг. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется агрегация данных из другой таблицы)
```sql
CREATE OR REPLACE FUNCTION calc_booking_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Booking
    SET total_amount = (
        COALESCE(
            (SELECT SUM(b.bs_price * b.bs_qty)
             FROM (
                 SELECT bs.price * bs.quantity AS bs_price,
                        bs.quantity AS bs_qty
                 FROM BookingService bs
                 WHERE bs.booking_id = NEW.booking_id
             ) b
            ), 0
        ) +
        COALESCE(
            (SELECT r.price_per_night * (bk.check_out - bk.check_in)
             FROM Room r
             JOIN Booking bk ON bk.room_id = r.room_id
             WHERE bk.booking_id = NEW.booking_id
            ), 0
        )
    )
    WHERE booking_id = NEW.booking_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_calc_booking_total
AFTER INSERT OR UPDATE ON BookingService
FOR EACH ROW
EXECUTE FUNCTION calc_booking_total();
```

**Таблица аудита**
```sql
CREATE TABLE Booking_Audit (
    audit_id SERIAL PRIMARY KEY,
    booking_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_booking_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Booking_Audit (
        booking_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.booking_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_booking_status
AFTER UPDATE ON Booking
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_booking_status();
```

### 6. Сложный SQL-запрос
Вывести загрузку номеров отеля: номер, статус бронирования, сумма оплат, список услуг.
```sql
SELECT
    r.room_number,
    r.category,
    r.price_per_night,
    b.status AS booking_status,
    b.check_in,
    b.check_out,
    COALESCE(SUM(p.amount), 0) AS total_paid,
    STRING_AGG(DISTINCT s.name, ', ') AS services

FROM Room r

LEFT JOIN Booking b
    ON r.room_id = b.room_id

LEFT JOIN Payment p
    ON b.booking_id = p.booking_id

LEFT JOIN BookingService bs
    ON b.booking_id = bs.booking_id

LEFT JOIN Service s
    ON bs.service_id = s.service_id

WHERE r.hotel_id = 1
  AND (b.status IS NULL OR b.status = 'confirmed')

GROUP BY
    r.room_id,
    r.room_number,
    r.category,
    r.price_per_night,
    b.booking_id,
    b.status,
    b.check_in,
    b.check_out

ORDER BY r.room_number;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=hotel_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 9. Поликлиника
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Пациент (id, фио, дата_рождения, пол, телефон, email, адрес, полис_омс, снилс)
- Врач (id, фио, специальность, телефон, email, кабинет, график)
- Приём (id, дата, время, жалобы, диагноз, статус)
- Услуга (id, название, код, цена, категория)
- Назначение (id, дата, описание, дозировка, статус)
- Медицинская_карта (id, номер, дата_открытия, группа_крови, аллергии, заметки)
- Отделение (id, название, корпус, этаж, телефон)

**Связи:**
- Пациент (1) имеет (0..1) Медицинская_карта
- Пациент (1) записывается (0..M) Приём
- Врач (0..M) относится (1) Отделение
- Врач (1) проводит (0..M) Приём
- Приём (1) включает (0..M) Услуга
- Приём (1) порождает (0..M) Назначение
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Department(department_id PK, name, building, floor, phone),
Doctor(doctor_id PK, full_name, specialty, phone, email, office, department_id FK),
Patient(patient_id PK, full_name, birth_date, gender, phone, email, address, insurance_policy UK, snils UK),
MedicalCard(card_id PK, card_number UK, open_date, blood_type, allergies, notes, patient_id UK FK),
Appointment(appointment_id PK, app_date, app_time, complaints, diagnosis, status, patient_id FK, doctor_id FK),
Service(service_id PK, name, code UK, price, category),
AppointmentService(appointment_id PK FK, service_id PK FK, quantity, price),
Prescription(prescription_id PK, presc_date, description, dosage, status, appointment_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность AppointmentService.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, doctor_id функционально определяет данные врача и его отделение, appointment_id определяет данные приёма и ссылки на пациента и врача. Связующая таблица AppointmentService имеет составной ключ (appointment_id, service_id), и её неключевые атрибуты quantity, price зависят от полного ключа.

Проверка второй нормальной формы показывает, что в AppointmentService все неключевые атрибуты зависят от полного составного ключа, что исключает частичные зависимости. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей — характеристики отделения, пациента и врача вынесены в отдельные таблицы и не дублируются.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Department (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    building VARCHAR(100),
    floor INT,
    phone VARCHAR(20)
);
```

```sql
CREATE TABLE Doctor (
    doctor_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    office VARCHAR(20),
    department_id INT,

    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);
```

```sql
CREATE TABLE Patient (
    patient_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    insurance_policy VARCHAR(20) UNIQUE,
    snils VARCHAR(14) UNIQUE
);
```

```sql
CREATE TABLE MedicalCard (
    card_id SERIAL PRIMARY KEY,
    card_number VARCHAR(20) NOT NULL UNIQUE,
    open_date DATE DEFAULT CURRENT_DATE,
    blood_type VARCHAR(5),
    allergies TEXT,
    notes TEXT,
    patient_id INT NOT NULL UNIQUE,

    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);
```

```sql
CREATE TABLE Appointment (
    appointment_id SERIAL PRIMARY KEY,
    app_date DATE NOT NULL,
    app_time TIME NOT NULL,
    complaints TEXT,
    diagnosis TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,

    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id)
);
```

```sql
CREATE TABLE Service (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    price DECIMAL(10,2) CHECK (price >= 0),
    category VARCHAR(100)
);
```

```sql
CREATE TABLE AppointmentService (
    appointment_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2),

    PRIMARY KEY (appointment_id, service_id),

    FOREIGN KEY (appointment_id) REFERENCES Appointment(appointment_id),
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);
```

```sql
CREATE TABLE Prescription (
    prescription_id SERIAL PRIMARY KEY,
    presc_date DATE DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    dosage VARCHAR(200),
    status VARCHAR(50) DEFAULT 'active',
    appointment_id INT NOT NULL,

    FOREIGN KEY (appointment_id) REFERENCES Appointment(appointment_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_doctor_department
ON Doctor(department_id);

CREATE INDEX idx_appointment_patient
ON Appointment(patient_id);

CREATE INDEX idx_appointment_doctor
ON Appointment(doctor_id);

CREATE INDEX idx_prescription_appt
ON Prescription(appointment_id);

CREATE INDEX idx_as_appointment
ON AppointmentService(appointment_id);
```
### 4. SQL: команды управления данными
**Department**
```sql
INSERT INTO Department (name, building, floor, phone)
VALUES ('Терапия', 'Главный корпус', 2, '111-111'),
       ('Хирургия', 'Хирургический корпус', 1, '222-222');
```

```sql
UPDATE Department
SET name = 'Терапевтическое отделение',
    building = 'Главный корпус',
    floor = 3,
    phone = '333-333'
WHERE department_id = 1;
```

```sql
DELETE FROM Department WHERE department_id = 2;
```

**Doctor**
```sql
INSERT INTO Doctor (full_name, specialty, phone, email, office, department_id)
VALUES ('Петров П.А.', 'Терапевт', '111-111', 'petrov@hospital.ru', '201', 1),
       ('Сидорова Е.В.', 'Хирург', '222-222', 'sidorova@hospital.ru', '105', 2);
```

```sql
UPDATE Doctor
SET full_name = 'Петров П.П.',
    specialty = 'Врач общей практики',
    phone = '999-999',
    email = 'petrov_vop@hospital.ru',
    office = '202',
    department_id = 1
WHERE doctor_id = 1;
```

```sql
DELETE FROM Doctor WHERE doctor_id = 2;
```

**Patient**
```sql
INSERT INTO Patient (full_name, birth_date, gender, phone, email, insurance_policy, snils)
VALUES ('Иванов Иван', '1980-05-15', 'М', '111-111', 'ivan@mail.ru', '1234567890123456', '123-456-789 01'),
       ('Петрова Анна', '1992-08-22', 'Ж', '222-222', 'petrova@mail.ru', '9876543210987654', '987-654-321 01');
```

```sql
UPDATE Patient
SET full_name = 'Иванов И.И.',
    phone = '333-333',
    email = 'ivanov@mail.ru',
    address = 'ул. Ленина, 1',
    insurance_policy = '1234567890123456'
WHERE patient_id = 1;
```

```sql
DELETE FROM Patient WHERE patient_id = 2;
```

**MedicalCard**
```sql
INSERT INTO MedicalCard (card_number, open_date, blood_type, allergies, patient_id)
VALUES ('MC-0001', '2020-01-15', 'A(II)+', 'Пенициллин', 1),
       ('MC-0002', '2021-06-01', 'B(III)-', 'Нет', 2);
```

```sql
UPDATE MedicalCard
SET card_number = 'MC-0001-Н',
    blood_type = 'A(II)-',
    allergies = 'Пенициллин, аспирин',
    notes = 'Хронический гастрит',
    patient_id = 1
WHERE card_id = 1;
```

```sql
DELETE FROM MedicalCard WHERE card_id = 2;
```

**Appointment**
```sql
INSERT INTO Appointment (app_date, app_time, complaints, diagnosis, patient_id, doctor_id)
VALUES ('2024-09-10', '10:00', 'Головная боль', 'Мигрень', 1, 1),
       ('2024-09-10', '11:00', 'Боль в спине', 'Остеохондроз', 1, 1);
```

```sql
UPDATE Appointment
SET app_date = '2024-09-11',
    app_time = '09:00',
    complaints = 'Головная боль, слабость',
    diagnosis = 'Мигрень, обострение',
    status = 'completed',
    patient_id = 1,
    doctor_id = 1
WHERE appointment_id = 1;
```

```sql
DELETE FROM Appointment WHERE appointment_id = 2;
```

**Service**
```sql
INSERT INTO Service (name, code, price, category)
VALUES ('Приём терапевта', 'SRV-001', 1500, 'консультация'),
       ('УЗИ брюшной полости', 'SRV-002', 2500, 'диагностика');
```

```sql
UPDATE Service
SET name = 'Приём терапевта (первичный)',
    code = 'SRV-001-Н',
    price = 2000,
    category = 'консультация'
WHERE service_id = 1;
```

```sql
DELETE FROM Service WHERE service_id = 2;
```

**AppointmentService**
```sql
INSERT INTO AppointmentService (appointment_id, service_id, quantity, price)
VALUES (1, 1, 1, 1500),
       (1, 2, 1, 2500);
```

```sql
UPDATE AppointmentService
SET quantity = 2
WHERE appointment_id = 1 AND service_id = 1;
```

```sql
DELETE FROM AppointmentService WHERE appointment_id = 1 AND service_id = 2;
```

**Prescription**
```sql
INSERT INTO Prescription (presc_date, description, dosage, appointment_id)
VALUES ('2024-09-10', 'Ибупрофен', '200 мг 3 раза в день', 1),
       ('2024-09-10', 'Но-шпа', '40 мг 2 раза в день', 1);
```

```sql
UPDATE Prescription
SET description = 'Ибупрофен 400 мг',
    dosage = '400 мг 3 раза в день',
    status = 'completed'
WHERE prescription_id = 1;
```

```sql
DELETE FROM Prescription WHERE prescription_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматическое создание медицинской карты при добавлении нового пациента. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется вставка в другую таблицу)
```sql
CREATE OR REPLACE FUNCTION create_medical_card()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO MedicalCard (card_number, patient_id)
    VALUES (
        'MC-' || TO_CHAR(NEW.patient_id, 'FM000000'),
        NEW.patient_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_create_medical_card
AFTER INSERT ON Patient
FOR EACH ROW
EXECUTE FUNCTION create_medical_card();
```

**Таблица аудита**
```sql
CREATE TABLE Prescription_Audit (
    audit_id SERIAL PRIMARY KEY,
    prescription_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_prescription_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Prescription_Audit (
        prescription_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.prescription_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_prescription_status
AFTER UPDATE ON Prescription
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_prescription_status();
```

### 6. Сложный SQL-запрос
История приёмов пациента: дата, врач, диагноз, назначения, оказанные услуги.
```sql
SELECT
    p.full_name AS patient,
    a.app_date,
    a.app_time,
    d.full_name AS doctor,
    d.specialty,
    a.diagnosis,
    a.status,
    STRING_AGG(DISTINCT s.name, ', ') AS services,
    STRING_AGG(DISTINCT pr.description || ' (' || pr.dosage || ')', ', ') AS prescriptions

FROM Patient p

JOIN Appointment a
    ON p.patient_id = a.patient_id

JOIN Doctor d
    ON a.doctor_id = d.doctor_id

LEFT JOIN AppointmentService aps
    ON a.appointment_id = aps.appointment_id

LEFT JOIN Service s
    ON aps.service_id = s.service_id

LEFT JOIN Prescription pr
    ON a.appointment_id = pr.appointment_id

WHERE p.patient_id = 1

GROUP BY
    p.full_name,
    a.appointment_id,
    a.app_date,
    a.app_time,
    d.full_name,
    d.specialty,
    a.diagnosis,
    a.status

ORDER BY a.app_date DESC, a.app_time DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=clinic_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 10. Комиссионный магазин
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Товар (id, артикул, название, категория, цена, описание, размеры)
- Квитанция (id, номер, дата_приёма, дата_выдачи, статус, сумма)
- Статус_квитанции (id, название, цвет, порядок)
- Позиция_квитанции (id, количество, цена_факт, состояние_приём)
- Акция (id, название, скидка_процент, дата_начала, дата_окончания, условие)
- Чек (id, номер, дата, сумма_итог, форма_оплаты, кассир)
- Кассир (id, табельный_номер, фио, смена)

**Связи:**
- Квитанция (1) имеет (1) Статус_квитанции
- Квитанция (1) включает (0..M) Позиция_квитанции
- Товар (0..M) участвует (0..M) Позиция_квитанции
- Квитанция (0..M) применяет (0..M) Акция
- Квитанция (0..1) порождает (0..1) Чек
- Чек (1) выбивается (1) Кассир
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Product(product_id PK, article UK, name, category, price, description, dimensions),
ReceiptStatus(status_id PK, name, display_color, sort_order),
Receipt(receipt_id PK, receipt_number UK, receive_date, issue_date, status, total_amount, status_id FK),
ReceiptItem(item_id PK, quantity, actual_price, received_condition, receipt_id FK, product_id FK),
Promotion(promotion_id PK, name, discount_percent, start_date, end_date, condition),
ReceiptPromotion(receipt_id PK FK, promotion_id PK FK, discount_amount),
Cashier(cashier_id PK, personnel_number UK, full_name, shift),
ReceiptCheck(check_id PK, check_number UK, check_date, total_amount, payment_form, receipt_id FK, cashier_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связей M:N через ассоциативные сущности ReceiptItem и ReceiptPromotion.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, product_id функционально определяет характеристики товара, receipt_id определяет данные квитанции и её статус.

Проверка второй и третьей нормальных форм подтверждает отсутствие частичных и транзитивных зависимостей. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы. В сущностях с составным ключом (ReceiptItem имеет собственный item_id PK, ReceiptPromotion — составной первичный ключ без неключевых атрибутов) частичные и транзитивные зависимости исключены.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    article VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(12,2) CHECK (price >= 0),
    description TEXT,
    dimensions VARCHAR(100)
);
```

```sql
CREATE TABLE ReceiptStatus (
    status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_color VARCHAR(7) DEFAULT '#FFFFFF',
    sort_order INT DEFAULT 0
);
```

```sql
CREATE TABLE Receipt (
    receipt_id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receive_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issue_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status_id INT NOT NULL,

    FOREIGN KEY (status_id) REFERENCES ReceiptStatus(status_id)
);
```

```sql
CREATE TABLE ReceiptItem (
    item_id SERIAL PRIMARY KEY,
    quantity INT NOT NULL CHECK (quantity > 0),
    actual_price DECIMAL(12,2),
    received_condition VARCHAR(200),
    receipt_id INT NOT NULL,
    product_id INT NOT NULL,

    FOREIGN KEY (receipt_id) REFERENCES Receipt(receipt_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);
```

```sql
CREATE TABLE Promotion (
    promotion_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    discount_percent DECIMAL(5,2) CHECK (discount_percent > 0 AND discount_percent <= 100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    condition TEXT,

    CHECK (end_date > start_date)
);
```

```sql
CREATE TABLE ReceiptPromotion (
    receipt_id INT NOT NULL,
    promotion_id INT NOT NULL,
    discount_amount DECIMAL(10,2),

    PRIMARY KEY (receipt_id, promotion_id),

    FOREIGN KEY (receipt_id) REFERENCES Receipt(receipt_id),
    FOREIGN KEY (promotion_id) REFERENCES Promotion(promotion_id)
);
```

```sql
CREATE TABLE Cashier (
    cashier_id SERIAL PRIMARY KEY,
    personnel_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    shift VARCHAR(50)
);
```

```sql
CREATE TABLE ReceiptCheck (
    check_id SERIAL PRIMARY KEY,
    check_number VARCHAR(50) NOT NULL UNIQUE,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2),
    payment_form VARCHAR(50),
    receipt_id INT NOT NULL,
    cashier_id INT NOT NULL,

    FOREIGN KEY (receipt_id) REFERENCES Receipt(receipt_id),
    FOREIGN KEY (cashier_id) REFERENCES Cashier(cashier_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_receipt_status
ON Receipt(status_id);

CREATE INDEX idx_item_receipt
ON ReceiptItem(receipt_id);

CREATE INDEX idx_item_product
ON ReceiptItem(product_id);

CREATE INDEX idx_check_receipt
ON ReceiptCheck(receipt_id);

CREATE INDEX idx_check_cashier
ON ReceiptCheck(cashier_id);
```
### 4. SQL: команды управления данными
**Product**
```sql
INSERT INTO Product (article, name, category, price)
VALUES ('TOV-001', 'Кроссовки Sport', 'Обувь', 4500),
       ('TOV-002', 'Футболка Basic', 'Одежда', 1200);
```

```sql
UPDATE Product
SET article = 'TOV-001-Н',
    name = 'Кроссовки Sport Pro',
    category = 'Обувь спортивная',
    price = 5500,
    description = 'Новая коллекция',
    dimensions = '42-45'
WHERE product_id = 1;
```

```sql
DELETE FROM Product WHERE product_id = 2;
```

**ReceiptStatus**
```sql
INSERT INTO ReceiptStatus (name, display_color, sort_order)
VALUES ('Принят в ремонт', '#FF9800', 1),
       ('Готов к выдаче', '#4CAF50', 2);
```

```sql
UPDATE ReceiptStatus
SET name = 'Принят',
    display_color = '#FF5722',
    sort_order = 1
WHERE status_id = 1;
```

```sql
DELETE FROM ReceiptStatus WHERE status_id = 2;
```

**Receipt**
```sql
INSERT INTO Receipt (receipt_number, receive_date, status_id)
VALUES ('RCP-2024-001', '2024-09-01', 1),
       ('RCP-2024-002', '2024-09-05', 1);
```

```sql
UPDATE Receipt
SET receipt_number = 'RCP-2024-001-ИЗМ',
    receive_date = '2024-09-02',
    issue_date = '2024-09-10',
    status_id = 2
WHERE receipt_id = 1;
```

```sql
DELETE FROM Receipt WHERE receipt_id = 2;
```

**ReceiptItem**
```sql
INSERT INTO ReceiptItem (quantity, actual_price, received_condition, receipt_id, product_id)
VALUES (1, 4500, 'Носок левый потёрт', 1, 1),
       (2, 1200, 'Без дефектов', 1, 2);
```

```sql
UPDATE ReceiptItem
SET quantity = 2,
    actual_price = 4000,
    received_condition = 'Без дефектов',
    product_id = 1
WHERE item_id = 1;
```

```sql
DELETE FROM ReceiptItem WHERE item_id = 2;
```

**Promotion**
```sql
INSERT INTO Promotion (name, discount_percent, start_date, end_date, condition)
VALUES ('Сезонная распродажа', 15, '2024-09-01', '2024-09-30', 'При сумме от 3000'),
       ('Уценка', 30, '2024-09-10', '2024-09-20', 'Товары с дефектом');
```

```sql
UPDATE Promotion
SET name = 'Осенняя распродажа',
    discount_percent = 20,
    start_date = '2024-09-15',
    end_date = '2024-10-15',
    condition = 'При сумме от 5000'
WHERE promotion_id = 1;
```

```sql
DELETE FROM Promotion WHERE promotion_id = 2;
```

**ReceiptPromotion**
```sql
INSERT INTO ReceiptPromotion (receipt_id, promotion_id, discount_amount)
VALUES (1, 1, 675),
       (2, 2, 360);
```

```sql
UPDATE ReceiptPromotion
SET discount_amount = 800
WHERE receipt_id = 1 AND promotion_id = 1;
```

```sql
DELETE FROM ReceiptPromotion WHERE receipt_id = 2 AND promotion_id = 2;
```

**Cashier**
```sql
INSERT INTO Cashier (personnel_number, full_name, shift)
VALUES ('CSH-001', 'Кузнецов А.А.', 'утренняя'),
       ('CSH-002', 'Смирнова Е.Е.', 'вечерняя');
```

```sql
UPDATE Cashier
SET personnel_number = 'CSH-001-Н',
    full_name = 'Кузнецов А.А. (ст.)',
    shift = 'дневная'
WHERE cashier_id = 1;
```

```sql
DELETE FROM Cashier WHERE cashier_id = 2;
```

**ReceiptCheck**
```sql
INSERT INTO ReceiptCheck (check_number, check_date, total_amount, payment_form, receipt_id, cashier_id)
VALUES ('CHK-001', '2024-09-10', 3825, 'card', 1, 1),
       ('CHK-002', '2024-09-12', 2040, 'cash', 2, 2);
```

```sql
UPDATE ReceiptCheck
SET check_number = 'CHK-001-ИЗМ',
    check_date = '2024-09-11',
    total_amount = 4000,
    payment_form = 'cash',
    receipt_id = 1,
    cashier_id = 1
WHERE check_id = 1;
```

```sql
DELETE FROM ReceiptCheck WHERE check_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматическое обновление суммы квитанции при изменении позиций. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется агрегация данных из другой таблицы)
```sql
CREATE OR REPLACE FUNCTION calc_receipt_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Receipt r
    SET total_amount = (
        SELECT COALESCE(SUM(ri.quantity * ri.actual_price), 0)
        FROM ReceiptItem ri
        WHERE ri.receipt_id = NEW.receipt_id
    )
    WHERE r.receipt_id = NEW.receipt_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_calc_receipt_total
AFTER INSERT OR UPDATE ON ReceiptItem
FOR EACH ROW
EXECUTE FUNCTION calc_receipt_total();
```

**Таблица аудита**
```sql
CREATE TABLE Receipt_Audit (
    audit_id SERIAL PRIMARY KEY,
    receipt_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_receipt_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Receipt_Audit (
        receipt_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.receipt_id,
        (SELECT name FROM ReceiptStatus WHERE status_id = OLD.status_id),
        (SELECT name FROM ReceiptStatus WHERE status_id = NEW.status_id),
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_receipt_status
AFTER UPDATE ON Receipt
FOR EACH ROW
WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id)
EXECUTE FUNCTION audit_receipt_status();
```

### 6. Сложный SQL-запрос
Отчёт по квитанциям: статус, сумма, товары, применённые акции, дата выдачи.
```sql
SELECT
    r.receipt_number,
    rs.name AS receipt_status,
    r.receive_date,
    r.issue_date,
    r.total_amount,
    COUNT(DISTINCT ri.item_id) AS items_count,
    STRING_AGG(DISTINCT p.name, ', ') AS products,
    STRING_AGG(DISTINCT pr.name, ', ') AS promotions,
    ck.check_number,
    ck.total_amount AS check_amount,
    ca.full_name AS cashier

FROM Receipt r

JOIN ReceiptStatus rs
    ON r.status_id = rs.status_id

LEFT JOIN ReceiptItem ri
    ON r.receipt_id = ri.receipt_id

LEFT JOIN Product p
    ON ri.product_id = p.product_id

LEFT JOIN ReceiptPromotion rp
    ON r.receipt_id = rp.receipt_id

LEFT JOIN Promotion pr
    ON rp.promotion_id = pr.promotion_id

LEFT JOIN ReceiptCheck ck
    ON r.receipt_id = ck.receipt_id

LEFT JOIN Cashier ca
    ON ck.cashier_id = ca.cashier_id

WHERE r.receive_date >= '2024-09-01'

GROUP BY
    r.receipt_id,
    r.receipt_number,
    rs.name,
    r.receive_date,
    r.issue_date,
    r.total_amount,
    ck.check_number,
    ck.total_amount,
    ca.full_name

ORDER BY r.receive_date DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=pawnshop_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 11. Экзамены
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Студент (id, фио, дата_рождения, телефон, email, курс, группа)
- Преподаватель (id, фио, учёная_степень, звание, кафедра, телефон, email)
- Экзамен (id, дата, время, аудитория, тип, форма_проведения)
- Оценка (id, балл, буквенная_оценка, дата_выставления, статус)
- Дисциплина (id, название, код, семестр, часы_лекции, часы_практики)
- Вопрос (id, текст, сложность, раздел, макс_балл)
- Результат_вопроса (id, получено_баллов, комментарий)

**Связи:**
- Студент (0..M) участвует (0..M) Экзамен
- Преподаватель (1) принимает (0..M) Экзамен
- Экзамен (1) содержит (0..M) Вопрос
- Студент (0..M) получает (0..M) Оценка
- Экзамен (1) выставляет (0..M) Оценка
- Экзамен (0..M) относится (1) Дисциплина
- Студент (0..M) отвечает (0..M) Вопрос
- Результат_вопроса (0..M) относится (1) Оценка
- Вопрос (1) имеет (0..M) Результат_вопроса
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Student(student_id PK, full_name, birth_date, phone, email, course, group_name),
Teacher(teacher_id PK, full_name, degree, title, department, phone, email),
Discipline(discipline_id PK, name, code UK, semester, lecture_hours, practice_hours),
Exam(exam_id PK, exam_date, exam_time, auditorium, exam_type, form, teacher_id FK, discipline_id FK),
ExamRegistration(exam_id PK FK, student_id PK FK),
Question(question_id PK, text, difficulty, section, max_score, exam_id FK),
Grade(grade_id PK, score, letter_grade, issue_date, status, student_id FK, exam_id FK),
QuestionResult(result_id PK, received_score, comment, grade_id FK, question_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связей M:N через ассоциативные сущности ExamRegistration и QuestionResult.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, student_id функционально определяет данные студента, exam_id определяет параметры экзамена и ссылки на преподавателя и дисциплину.

Проверка второй нормальной формы показывает отсутствие частичных зависимостей, так как все таблицы с составными ключами (ExamRegistration — составной PK без неключевых атрибутов, QuestionResult — собственный PK result_id) корректно спроектированы. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Student (
    student_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    course INT CHECK (course BETWEEN 1 AND 6),
    group_name VARCHAR(50)
);
```

```sql
CREATE TABLE Teacher (
    teacher_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    degree VARCHAR(50),
    title VARCHAR(100),
    department VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE
);
```

```sql
CREATE TABLE Discipline (
    discipline_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    semester INT CHECK (semester BETWEEN 1 AND 12),
    lecture_hours INT CHECK (lecture_hours >= 0),
    practice_hours INT CHECK (practice_hours >= 0)
);
```

```sql
CREATE TABLE Exam (
    exam_id SERIAL PRIMARY KEY,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL,
    auditorium VARCHAR(20),
    exam_type VARCHAR(100),
    form VARCHAR(50),
    teacher_id INT NOT NULL,
    discipline_id INT NOT NULL,

    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id),
    FOREIGN KEY (discipline_id) REFERENCES Discipline(discipline_id)
);
```

```sql
CREATE TABLE ExamRegistration (
    exam_id INT NOT NULL,
    student_id INT NOT NULL,

    PRIMARY KEY (exam_id, student_id),

    FOREIGN KEY (exam_id) REFERENCES Exam(exam_id),
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
);
```

```sql
CREATE TABLE Question (
    question_id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    difficulty INT CHECK (difficulty BETWEEN 1 AND 10),
    section VARCHAR(200),
    max_score DECIMAL(6,2) NOT NULL CHECK (max_score > 0),
    exam_id INT NOT NULL,

    FOREIGN KEY (exam_id) REFERENCES Exam(exam_id)
);
```

```sql
CREATE TABLE Grade (
    grade_id SERIAL PRIMARY KEY,
    score DECIMAL(6,2) CHECK (score >= 0),
    letter_grade VARCHAR(2),
    issue_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'draft',
    student_id INT NOT NULL,
    exam_id INT NOT NULL,

    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (exam_id) REFERENCES Exam(exam_id)
);
```

```sql
CREATE TABLE QuestionResult (
    result_id SERIAL PRIMARY KEY,
    received_score DECIMAL(6,2) DEFAULT 0,
    comment TEXT,
    grade_id INT NOT NULL,
    question_id INT NOT NULL,

    FOREIGN KEY (grade_id) REFERENCES Grade(grade_id),
    FOREIGN KEY (question_id) REFERENCES Question(question_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_exam_teacher
ON Exam(teacher_id);

CREATE INDEX idx_exam_discipline
ON Exam(discipline_id);

CREATE INDEX idx_question_exam
ON Question(exam_id);

CREATE INDEX idx_grade_student
ON Grade(student_id);

CREATE INDEX idx_grade_exam
ON Grade(exam_id);

CREATE INDEX idx_qr_grade
ON QuestionResult(grade_id);

CREATE INDEX idx_qr_question
ON QuestionResult(question_id);
```
### 4. SQL: команды управления данными
**Student**
```sql
INSERT INTO Student (full_name, phone, email, course, group_name)
VALUES ('Сидоров Пётр', '111-111', 'sidorov@mail.ru', 2, 'ИС-21'),
       ('Кузнецова Мария', '222-222', 'kuznetsova@mail.ru', 2, 'ИС-21');
```

```sql
UPDATE Student
SET full_name = 'Сидоров П.П.',
    phone = '999-999',
    email = 'sidorov_p@mail.ru',
    course = 3,
    group_name = 'ИС-31'
WHERE student_id = 1;
```

```sql
DELETE FROM Student WHERE student_id = 2;
```

**Teacher**
```sql
INSERT INTO Teacher (full_name, degree, title, department, phone, email)
VALUES ('Проф. Иванов А.А.', 'д.ф.-м.н.', 'Профессор', 'Кафедра математики', '111-111', 'ivanov@uni.ru'),
       ('Доц. Петрова Е.В.', 'к.т.н.', 'Доцент', 'Кафедра информатики', '222-222', 'petrova@uni.ru');
```

```sql
UPDATE Teacher
SET full_name = 'Проф. Иванов А.А. (зав.)',
    degree = 'д.ф.-м.н.',
    title = 'Зав. кафедрой',
    department = 'Кафедра математики',
    phone = '333-333',
    email = 'ivanov_head@uni.ru'
WHERE teacher_id = 1;
```

```sql
DELETE FROM Teacher WHERE teacher_id = 2;
```

**Discipline**
```sql
INSERT INTO Discipline (name, code, semester, lecture_hours, practice_hours)
VALUES ('Математический анализ', 'МА-01', 1, 64, 64),
       ('Программирование на Python', 'ПР-01', 1, 32, 48);
```

```sql
UPDATE Discipline
SET name = 'Матанализ и линейная алгебра',
    code = 'МА-02',
    semester = 2,
    lecture_hours = 48,
    practice_hours = 48
WHERE discipline_id = 1;
```

```sql
DELETE FROM Discipline WHERE discipline_id = 2;
```

**Exam**
```sql
INSERT INTO Exam (exam_date, exam_time, auditorium, exam_type, form, teacher_id, discipline_id)
VALUES ('2024-06-10', '10:00', '201', 'письменный', 'билеты', 1, 1),
       ('2024-06-15', '14:00', '305', 'устный', 'собеседование', 2, 2);
```

```sql
UPDATE Exam
SET exam_date = '2024-06-11',
    exam_time = '09:00',
    auditorium = '301',
    exam_type = 'письменный',
    form = 'тест',
    teacher_id = 1,
    discipline_id = 1
WHERE exam_id = 1;
```

```sql
DELETE FROM Exam WHERE exam_id = 2;
```

**ExamRegistration**
```sql
INSERT INTO ExamRegistration (exam_id, student_id)
VALUES (1, 1),
       (1, 2);
```

```sql
DELETE FROM ExamRegistration WHERE exam_id = 1 AND student_id = 2;
```

**Question**
```sql
INSERT INTO Question (text, difficulty, section, max_score, exam_id)
VALUES ('Производная функции sin(x)', 2, 'Производные', 5, 1),
       ('Интеграл от exp(-x^2)', 7, 'Интегралы', 10, 1);
```

```sql
UPDATE Question
SET text = 'Производная функции sin(2x)',
    difficulty = 3,
    section = 'Производные',
    max_score = 6,
    exam_id = 1
WHERE question_id = 1;
```

```sql
DELETE FROM Question WHERE question_id = 2;
```

**Grade**
```sql
INSERT INTO Grade (score, letter_grade, status, student_id, exam_id)
VALUES (85, '5', 'published', 1, 1),
       (67, '4', 'published', 2, 1);
```

```sql
UPDATE Grade
SET score = 92,
    letter_grade = '5',
    issue_date = '2024-06-12',
    status = 'published',
    student_id = 1,
    exam_id = 1
WHERE grade_id = 1;
```

```sql
DELETE FROM Grade WHERE grade_id = 2;
```

**QuestionResult**
```sql
INSERT INTO QuestionResult (received_score, comment, grade_id, question_id)
VALUES (5, 'Верно', 1, 1),
       (8, 'Частично верно', 1, 2);
```

```sql
UPDATE QuestionResult
SET received_score = 4,
    comment = 'Ошибка в знаке',
    question_id = 1
WHERE result_id = 1;
```

```sql
DELETE FROM QuestionResult WHERE result_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматический расчёт буквенной оценки по сумме баллов за вопросы. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется агрегация данных из другой таблицы)
```sql
CREATE OR REPLACE FUNCTION calc_grade_after_result()
RETURNS TRIGGER AS $$
DECLARE
    total_score DECIMAL(6,2);
    new_letter VARCHAR(2);
BEGIN
    SELECT SUM(received_score)
    INTO total_score
    FROM QuestionResult
    WHERE grade_id = NEW.grade_id;

    IF total_score >= 85 THEN new_letter := '5';
    ELSIF total_score >= 70 THEN new_letter := '4';
    ELSIF total_score >= 50 THEN new_letter := '3';
    ELSE new_letter := '2';
    END IF;

    UPDATE Grade
    SET score = total_score,
        letter_grade = new_letter
    WHERE grade_id = NEW.grade_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_calc_grade_after_result
AFTER INSERT OR UPDATE ON QuestionResult
FOR EACH ROW
EXECUTE FUNCTION calc_grade_after_result();
```

**Таблица аудита**
```sql
CREATE TABLE Grade_Audit (
    audit_id SERIAL PRIMARY KEY,
    grade_id INT,
    old_score DECIMAL(6,2),
    new_score DECIMAL(6,2),
    old_letter VARCHAR(2),
    new_letter VARCHAR(2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_grade_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Grade_Audit (
        grade_id,
        old_score,
        new_score,
        old_letter,
        new_letter,
        changed_by
    )
    VALUES (
        NEW.grade_id,
        OLD.score,
        NEW.score,
        OLD.letter_grade,
        NEW.letter_grade,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_grade_change
AFTER UPDATE ON Grade
FOR EACH ROW
WHEN (OLD.score IS DISTINCT FROM NEW.score OR OLD.letter_grade IS DISTINCT FROM NEW.letter_grade)
EXECUTE FUNCTION audit_grade_change();
```

### 6. Сложный SQL-запрос
Ведомость экзамена: студенты, общий балл, буквенная оценка, результаты по вопросам.
```sql
SELECT
    d.name AS discipline,
    e.exam_date,
    s.full_name AS student,
    g.score,
    g.letter_grade,
    COUNT(q.question_id) AS total_questions,
    SUM(qr.received_score) AS total_received,
    ROUND(AVG(qr.received_score / NULLIF(q.max_score, 0)) * 100, 2) AS avg_percent

FROM Exam e

JOIN Discipline d
    ON e.discipline_id = d.discipline_id

JOIN ExamRegistration er
    ON e.exam_id = er.exam_id

JOIN Student s
    ON er.student_id = s.student_id

JOIN Grade g
    ON s.student_id = g.student_id
    AND e.exam_id = g.exam_id

LEFT JOIN QuestionResult qr
    ON g.grade_id = qr.grade_id

LEFT JOIN Question q
    ON qr.question_id = q.question_id

WHERE e.exam_id = 1

GROUP BY
    d.name,
    e.exam_date,
    s.full_name,
    g.score,
    g.letter_grade

ORDER BY g.score DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=exam_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 12. Автотранспортное предприятие
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Транспортное_средство (id, госномер, марка, модель, год_выпуска, цвет, вин, категория)
- Водитель (id, фио, дата_рождения, телефон, email, водительское_удостоверение, стаж)
- Рейс (id, номер, дата_выезда, время_выезда, дата_возврата, расстояние, статус)
- Точка_маршрута (id, название, адрес, тип, время_прибытия_план, время_прибытия_факт)
- Расход (id, тип_расхода, сумма, количество, единица, описание)
- Техобслуживание (id, дата, тип, пробег, описание, стоимость, статус)
- Гараж (id, название, адрес, телефон, вместимость)

**Связи:**
- Транспортное_средство (0..M) относится (1) Гараж
- Транспортное_средство (1) выполняет (0..M) Рейс
- Водитель (1) назначается (0..M) Рейс
- Рейс (1) содержит (0..M) Точка_маршрута
- Рейс (1) имеет (0..M) Расход
- Транспортное_средство (1) проходит (0..M) Техобслуживание
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Garage(garage_id PK, name, address, phone, capacity),
Vehicle(vehicle_id PK, plate_number UK, brand, model, year, color, vin UK, category, garage_id FK),
Driver(driver_id PK, full_name, birth_date, phone, email, license_number UK, experience_years),
Trip(trip_id PK, trip_number UK, departure_date, departure_time, return_date, distance_km, status, vehicle_id FK, driver_id FK),
RoutePoint(point_id PK, name, address, point_type, planned_arrival, actual_arrival, trip_id FK),
Expense(expense_id PK, expense_type, amount, quantity, unit, description, trip_id FK),
Maintenance(maintenance_id PK, maint_date, maint_type, mileage, description, cost, status, vehicle_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, vehicle_id функционально определяет данные ТС и гараж, trip_id определяет данные рейса и ссылки на ТС и водителя. Все таблицы имеют простые первичные ключи, поэтому частичные зависимости отсутствуют.

Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей неключевых атрибутов. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы (например, данные гаража не хранятся в Vehicle, а данные водителя не дублируются в Trip).

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Garage (
    garage_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    capacity INT CHECK (capacity > 0)
);
```

```sql
CREATE TABLE Vehicle (
    vehicle_id SERIAL PRIMARY KEY,
    plate_number VARCHAR(15) NOT NULL UNIQUE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT CHECK (year > 1900),
    color VARCHAR(50),
    vin VARCHAR(17) UNIQUE,
    category VARCHAR(50),
    garage_id INT,

    FOREIGN KEY (garage_id) REFERENCES Garage(garage_id)
);
```

```sql
CREATE TABLE Driver (
    driver_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    license_number VARCHAR(20) NOT NULL UNIQUE,
    experience_years INT DEFAULT 0
);
```

```sql
CREATE TABLE Trip (
    trip_id SERIAL PRIMARY KEY,
    trip_number VARCHAR(50) NOT NULL UNIQUE,
    departure_date DATE NOT NULL,
    departure_time TIME,
    return_date DATE,
    distance_km DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned',
    vehicle_id INT NOT NULL,
    driver_id INT NOT NULL,

    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
);
```

```sql
CREATE TABLE RoutePoint (
    point_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    point_type VARCHAR(50),
    planned_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    trip_id INT NOT NULL,

    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);
```

```sql
CREATE TABLE Expense (
    expense_id SERIAL PRIMARY KEY,
    expense_type VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    quantity DECIMAL(10,2) DEFAULT 1,
    unit VARCHAR(20),
    description TEXT,
    trip_id INT NOT NULL,

    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);
```

```sql
CREATE TABLE Maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    maint_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maint_type VARCHAR(100),
    mileage INT CHECK (mileage >= 0),
    description TEXT,
    cost DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned',
    vehicle_id INT NOT NULL,

    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_vehicle_garage
ON Vehicle(garage_id);

CREATE INDEX idx_trip_vehicle
ON Trip(vehicle_id);

CREATE INDEX idx_trip_driver
ON Trip(driver_id);

CREATE INDEX idx_point_trip
ON RoutePoint(trip_id);

CREATE INDEX idx_expense_trip
ON Expense(trip_id);

CREATE INDEX idx_maint_vehicle
ON Maintenance(vehicle_id);
```
### 4. SQL: команды управления данными
**Garage**
```sql
INSERT INTO Garage (name, address, phone, capacity)
VALUES ('Центральный гараж', 'ул. Автомобильная, 1', '111-111', 20),
       ('Западный гараж', 'ул. Дальняя, 10', '222-222', 10);
```

```sql
UPDATE Garage
SET name = 'Главный гараж',
    address = 'ул. Автомобильная, 5',
    phone = '333-333',
    capacity = 30
WHERE garage_id = 1;
```

```sql
DELETE FROM Garage WHERE garage_id = 2;
```

**Vehicle**
```sql
INSERT INTO Vehicle (plate_number, brand, model, year, color, category, garage_id)
VALUES ('А123БВ777', 'Toyota', 'Camry', 2020, 'чёрный', 'легковой', 1),
       ('В456ГД777', 'ГАЗ', 'Next', 2019, 'белый', 'грузовой', 1);
```

```sql
UPDATE Vehicle
SET plate_number = 'А999БВ777',
    brand = 'Toyota',
    model = 'Camry 50',
    year = 2022,
    color = 'серебристый',
    vin = 'JTN12345678901234',
    category = 'легковой',
    garage_id = 1
WHERE vehicle_id = 1;
```

```sql
DELETE FROM Vehicle WHERE vehicle_id = 2;
```

**Driver**
```sql
INSERT INTO Driver (full_name, phone, email, license_number, experience_years)
VALUES ('Николаев Николай', '111-111', 'nikolaev@mail.ru', '77 АВ 123456', 10),
       ('Алексеев Алексей', '222-222', 'alekseev@mail.ru', '77 СД 654321', 5);
```

```sql
UPDATE Driver
SET full_name = 'Николаев Н.Н.',
    phone = '999-999',
    email = 'nikolaev_n@mail.ru',
    license_number = '77 АВ 123456',
    experience_years = 12
WHERE driver_id = 1;
```

```sql
DELETE FROM Driver WHERE driver_id = 2;
```

**Trip**
```sql
INSERT INTO Trip (trip_number, departure_date, departure_time, distance_km, status, vehicle_id, driver_id)
VALUES ('TRP-2024-001', '2024-09-01', '08:00', 250, 'completed', 1, 1),
       ('TRP-2024-002', '2024-09-05', '09:00', 120, 'planned', 1, 1);
```

```sql
UPDATE Trip
SET trip_number = 'TRP-2024-001-ИЗМ',
    departure_date = '2024-09-02',
    departure_time = '07:00',
    return_date = '2024-09-02',
    distance_km = 300,
    status = 'completed',
    vehicle_id = 1,
    driver_id = 1
WHERE trip_id = 1;
```

```sql
DELETE FROM Trip WHERE trip_id = 2;
```

**RoutePoint**
```sql
INSERT INTO RoutePoint (name, address, point_type, planned_arrival, trip_id)
VALUES ('Склад №1', 'ул. Промышленная, 5', 'погрузка', '2024-09-01 10:00', 1),
       ('Магазин "Продукты"', 'ул. Центральная, 10', 'разгрузка', '2024-09-01 12:00', 1);
```

```sql
UPDATE RoutePoint
SET name = 'Склад №2',
    address = 'ул. Промышленная, 15',
    point_type = 'погрузка',
    planned_arrival = '2024-09-01 11:00',
    actual_arrival = '2024-09-01 10:45',
    trip_id = 1
WHERE point_id = 1;
```

```sql
DELETE FROM RoutePoint WHERE point_id = 2;
```

**Expense**
```sql
INSERT INTO Expense (expense_type, amount, quantity, unit, trip_id)
VALUES ('Топливо', 5000, 100, 'л', 1),
       ('Платные дороги', 1500, 1, 'шт', 1);
```

```sql
UPDATE Expense
SET expense_type = 'Топливо (АИ-95)',
    amount = 6000,
    quantity = 120,
    unit = 'л',
    description = 'Заправка на АЗС Лукойл',
    trip_id = 1
WHERE expense_id = 1;
```

```sql
DELETE FROM Expense WHERE expense_id = 2;
```

**Maintenance**
```sql
INSERT INTO Maintenance (maint_date, maint_type, mileage, description, cost, status, vehicle_id)
VALUES ('2024-08-15', 'ТО-10000', 15000, 'Замена масла, фильтров', 8000, 'completed', 1),
       ('2024-09-10', 'ТО-20000', 20500, 'Комплексное ТО', 15000, 'planned', 1);
```

```sql
UPDATE Maintenance
SET maint_date = '2024-08-20',
    maint_type = 'ТО-15000',
    mileage = 16000,
    description = 'Замена масла, фильтров, свечей',
    cost = 12000,
    status = 'completed',
    vehicle_id = 1
WHERE maintenance_id = 1;
```

```sql
DELETE FROM Maintenance WHERE maintenance_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматическое обновление статуса рейса на «in_progress» при добавлении первой точки маршрута. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется проверка существования записей в другой таблице)
```sql
CREATE OR REPLACE FUNCTION update_trip_status_on_point()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT status FROM Trip WHERE trip_id = NEW.trip_id) = 'planned' THEN
        UPDATE Trip
        SET status = 'in_progress'
        WHERE trip_id = NEW.trip_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_update_trip_status_on_point
AFTER INSERT ON RoutePoint
FOR EACH ROW
EXECUTE FUNCTION update_trip_status_on_point();
```

**Таблица аудита**
```sql
CREATE TABLE Trip_Audit (
    audit_id SERIAL PRIMARY KEY,
    trip_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_trip_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Trip_Audit (
        trip_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.trip_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_trip_status
AFTER UPDATE ON Trip
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_trip_status();
```

### 6. Сложный SQL-запрос
Отчёт по рейсу: маршрут, расходы, пробег, статус ТО автомобиля.
```sql
SELECT
    t.trip_number,
    t.departure_date,
    v.plate_number,
    v.brand || ' ' || v.model AS vehicle,
    d.full_name AS driver,
    t.distance_km,
    t.status,
    COUNT(rp.point_id) AS points_count,
    STRING_AGG(rp.name || '(' || rp.point_type || ')', ' -> ' ORDER BY rp.planned_arrival) AS route,
    COALESCE(SUM(e.amount), 0) AS total_expenses,
    m.maint_date AS last_maintenance

FROM Trip t

JOIN Vehicle v
    ON t.vehicle_id = v.vehicle_id

JOIN Driver d
    ON t.driver_id = d.driver_id

LEFT JOIN RoutePoint rp
    ON t.trip_id = rp.trip_id

LEFT JOIN Expense e
    ON t.trip_id = e.trip_id

LEFT JOIN LATERAL (
    SELECT maint_date
    FROM Maintenance m
    WHERE m.vehicle_id = v.vehicle_id
      AND m.status = 'completed'
    ORDER BY m.maint_date DESC
    LIMIT 1
) m ON TRUE

WHERE t.trip_id = 1

GROUP BY
    t.trip_id,
    t.trip_number,
    t.departure_date,
    v.plate_number,
    v.brand,
    v.model,
    d.full_name,
    t.distance_km,
    t.status,
    m.maint_date

ORDER BY t.departure_date;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=transport_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 13. Туристическое агентство
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Клиент (id, фио, дата_рождения, телефон, email, паспорт, предпочтения)
- Маршрут (id, название, код, страна, город, длительность, сложность, цена)
- Путёвка (id, номер, дата_начала, дата_конца, статус, сумма)
- Отель (id, название, адрес, телефон, звёздность, тип_размещения)
- Туроператор (id, название, инн, телефон, email, лицензия)
- Услуга (id, название, тип, цена, описание, дата_проведения)
- Платеж (id, дата, сумма, способ, статус, дата_оплаты)

**Связи:**
- Клиент (1) покупает (0..M) Путёвка
- Маршрут (1) включается в (0..M) Путёвка
- Путёвка (0..M) использует (0..M) Услуга
- Маршрут (0..M) предлагает (1) Туроператор
- Маршрут (0..M) использует (0..M) Отель
- Путёвка (1) порождает (0..M) Платеж
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Touroperator(operator_id PK, name, inn UK, phone, email, license),
Hotel(hotel_id PK, name, address, phone, stars, board_type),
Route(route_id PK, name, code UK, country, city, duration_days, difficulty, price, operator_id FK),
RouteHotel(route_id PK FK, hotel_id PK FK),
Client(client_id PK, full_name, birth_date, phone, email, passport UK, preferences),
Voucher(voucher_id PK, voucher_number UK, start_date, end_date, status, total_amount, client_id FK, route_id FK),
VoucherService(voucher_id PK FK, service_id PK FK, quantity, price),
Service(service_id PK, name, service_type, price, description, service_date),
Payment(payment_id PK, payment_date, amount, method, status, voucher_id FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связей M:N через ассоциативные сущности RouteHotel и VoucherService.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, route_id функционально определяет данные маршрута и оператора, voucher_id определяет данные путёвки и ссылки на клиента и маршрут.

Проверка второй и третьей нормальных форм подтверждает отсутствие частичных и транзитивных зависимостей. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Touroperator (
    operator_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    inn VARCHAR(12) NOT NULL UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    license VARCHAR(50)
);
```

```sql
CREATE TABLE Hotel (
    hotel_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    stars INT CHECK (stars BETWEEN 1 AND 5),
    board_type VARCHAR(100)
);
```

```sql
CREATE TABLE Route (
    route_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    duration_days INT CHECK (duration_days > 0),
    difficulty VARCHAR(50),
    price DECIMAL(12,2) CHECK (price >= 0),
    operator_id INT NOT NULL,

    FOREIGN KEY (operator_id) REFERENCES Touroperator(operator_id)
);
```

```sql
CREATE TABLE RouteHotel (
    route_id INT NOT NULL,
    hotel_id INT NOT NULL,

    PRIMARY KEY (route_id, hotel_id),

    FOREIGN KEY (route_id) REFERENCES Route(route_id),
    FOREIGN KEY (hotel_id) REFERENCES Hotel(hotel_id)
);
```

```sql
CREATE TABLE Client (
    client_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    passport VARCHAR(20) UNIQUE,
    preferences TEXT
);
```

```sql
CREATE TABLE Voucher (
    voucher_id SERIAL PRIMARY KEY,
    voucher_number VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'booked',
    total_amount DECIMAL(12,2) DEFAULT 0,
    client_id INT NOT NULL,
    route_id INT NOT NULL,

    FOREIGN KEY (client_id) REFERENCES Client(client_id),
    FOREIGN KEY (route_id) REFERENCES Route(route_id),

    CHECK (end_date > start_date)
);
```

```sql
CREATE TABLE Service (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    service_type VARCHAR(100),
    price DECIMAL(10,2) CHECK (price >= 0),
    description TEXT,
    service_date DATE
);
```

```sql
CREATE TABLE VoucherService (
    voucher_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2),

    PRIMARY KEY (voucher_id, service_id),

    FOREIGN KEY (voucher_id) REFERENCES Voucher(voucher_id),
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);
```

```sql
CREATE TABLE Payment (
    payment_id SERIAL PRIMARY KEY,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    voucher_id INT NOT NULL,

    FOREIGN KEY (voucher_id) REFERENCES Voucher(voucher_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_route_operator
ON Route(operator_id);

CREATE INDEX idx_voucher_client
ON Voucher(client_id);

CREATE INDEX idx_voucher_route
ON Voucher(route_id);

CREATE INDEX idx_payment_voucher
ON Payment(voucher_id);
```
### 4. SQL: команды управления данными
**Touroperator**
```sql
INSERT INTO Touroperator (name, inn, phone, email, license)
VALUES ('ООО Тур-Тревел', '7701234567', '111-111', 'info@tur-travel.ru', 'ЛЦ-001'),
       ('АО Глобус', '7707654321', '222-222', 'info@globus.ru', 'ЛЦ-002');
```

```sql
UPDATE Touroperator
SET name = 'ООО Тур-Тревел (главный)',
    phone = '999-999',
    email = 'main@tur-travel.ru',
    license = 'ЛЦ-001-Н'
WHERE operator_id = 1;
```

```sql
DELETE FROM Touroperator WHERE operator_id = 2;
```

**Hotel**
```sql
INSERT INTO Hotel (name, address, stars, board_type)
VALUES ('Отель Солнечный', 'Турция, Анталья', 5, 'ALL'),
       ('Гостевой дом Уют', 'Крым, Ялта', 3, 'HB');
```

```sql
UPDATE Hotel
SET name = 'Отель Солнечный Люкс',
    address = 'Турция, Сиде',
    stars = 5,
    board_type = 'ALL INCLUSIVE'
WHERE hotel_id = 1;
```

```sql
DELETE FROM Hotel WHERE hotel_id = 2;
```

**Route**
```sql
INSERT INTO Route (name, code, country, city, duration_days, price, operator_id)
VALUES ('Турция недельная', 'TUR-7', 'Турция', 'Анталья', 7, 45000, 1),
       ('Крым выходного дня', 'CRM-3', 'Россия', 'Ялта', 3, 15000, 1);
```

```sql
UPDATE Route
SET name = 'Турция 10 дней',
    code = 'TUR-10',
    country = 'Турция',
    city = 'Кемер',
    duration_days = 10,
    difficulty = 'лёгкий',
    price = 65000,
    operator_id = 1
WHERE route_id = 1;
```

```sql
DELETE FROM Route WHERE route_id = 2;
```

**RouteHotel**
```sql
INSERT INTO RouteHotel (route_id, hotel_id)
VALUES (1, 1),
       (2, 2);
```

```sql
DELETE FROM RouteHotel WHERE route_id = 2 AND hotel_id = 2;
```

**Client**
```sql
INSERT INTO Client (full_name, phone, email, passport, preferences)
VALUES ('Петров Пётр', '111-111', 'petrov@mail.ru', '4000 111111', 'пляжный отдых'),
       ('Сидорова Анна', '222-222', 'sidorova@mail.ru', '4000 222222', 'экскурсии');
```

```sql
UPDATE Client
SET full_name = 'Петров П.П.',
    phone = '333-333',
    email = 'petrov_p@mail.ru',
    passport = '4000 111111',
    preferences = 'пляжный отдых, дайвинг'
WHERE client_id = 1;
```

```sql
DELETE FROM Client WHERE client_id = 2;
```

**Voucher**
```sql
INSERT INTO Voucher (voucher_number, start_date, end_date, status, client_id, route_id)
VALUES ('VCH-2024-001', '2024-09-15', '2024-09-22', 'booked', 1, 1),
       ('VCH-2024-002', '2024-10-01', '2024-10-04', 'paid', 2, 2);
```

```sql
UPDATE Voucher
SET voucher_number = 'VCH-2024-001-ИЗМ',
    start_date = '2024-09-20',
    end_date = '2024-09-27',
    status = 'paid',
    client_id = 1,
    route_id = 1
WHERE voucher_id = 1;
```

```sql
DELETE FROM Voucher WHERE voucher_id = 2;
```

**Service**
```sql
INSERT INTO Service (name, service_type, price)
VALUES ('Экскурсия на яхте', 'развлечение', 3000),
       ('Трансфер из аэропорта', 'транспорт', 1500);
```

```sql
UPDATE Service
SET name = 'Экскурсия на яхте (с обедом)',
    service_type = 'развлечение',
    price = 5000,
    description = 'Морская прогулка 4 часа'
WHERE service_id = 1;
```

```sql
DELETE FROM Service WHERE service_id = 2;
```

**VoucherService**
```sql
INSERT INTO VoucherService (voucher_id, service_id, quantity, price)
VALUES (1, 1, 2, 3000),
       (2, 2, 1, 1500);
```

```sql
UPDATE VoucherService
SET quantity = 3,
    price = 5000
WHERE voucher_id = 1 AND service_id = 1;
```

```sql
DELETE FROM VoucherService WHERE voucher_id = 2 AND service_id = 2;
```

**Payment**
```sql
INSERT INTO Payment (payment_date, amount, method, status, voucher_id)
VALUES ('2024-09-10', 45000, 'card', 'paid', 1),
       ('2024-09-15', 15000, 'cash', 'paid', 2);
```

```sql
UPDATE Payment
SET payment_date = '2024-09-12',
    amount = 65000,
    method = 'card',
    status = 'paid',
    voucher_id = 1
WHERE payment_id = 1;
```

```sql
DELETE FROM Payment WHERE payment_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
При изменении статуса путёвки на «cancelled» — пометить все связанные платежи как «refunded». (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется массовое обновление другой таблицы)
```sql
CREATE OR REPLACE FUNCTION cancel_payments_on_voucher()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
        UPDATE Payment
        SET status = 'refunded'
        WHERE voucher_id = NEW.voucher_id
          AND status != 'refunded';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_cancel_payments_on_voucher
AFTER UPDATE ON Voucher
FOR EACH ROW
EXECUTE FUNCTION cancel_payments_on_voucher();
```

**Таблица аудита**
```sql
CREATE TABLE Voucher_Audit (
    audit_id SERIAL PRIMARY KEY,
    voucher_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_voucher_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Voucher_Audit (
        voucher_id,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        NEW.voucher_id,
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_voucher_status
AFTER UPDATE ON Voucher
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_voucher_status();
```

### 6. Сложный SQL-запрос
Отчёт по проданным путёвкам: клиент, маршрут, оплаты, услуги.
```sql
SELECT
    c.full_name AS client,
    v.voucher_number,
    r.name AS route,
    r.country,
    v.start_date,
    v.end_date,
    v.status,
    v.total_amount,
    COALESCE(SUM(p.amount), 0) AS paid_amount,
    STRING_AGG(DISTINCT s.name, ', ') AS additional_services

FROM Voucher v

JOIN Client c
    ON v.client_id = c.client_id

JOIN Route r
    ON v.route_id = r.route_id

LEFT JOIN Payment p
    ON v.voucher_id = p.voucher_id

LEFT JOIN VoucherService vs
    ON v.voucher_id = vs.voucher_id

LEFT JOIN Service s
    ON vs.service_id = s.service_id

WHERE v.status IN ('paid', 'booked')

GROUP BY
    c.full_name,
    v.voucher_id,
    v.voucher_number,
    r.name,
    r.country,
    v.start_date,
    v.end_date,
    v.status,
    v.total_amount

ORDER BY v.start_date DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=tourism_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 14. Банк
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Клиент (id, фио, дата_рождения, телефон, email, паспорт, адрес)
- Счёт (id, номер, дата_открытия, дата_закрытия, тип, валюта, остаток, статус)
- Операция (id, дата, сумма, тип, описание, статус)
- Банк (id, название, бик, корреспондентский_счёт, адрес, телефон)
- Сотрудник (id, фио, должность, телефон, email, отдел)
- Вклад (id, номер_договора, дата_начала, дата_окончания, сумма, процентная_ставка)

**Связи:**
- Клиент (1) владеет (0..M) Счёт
- Счёт (1) проводит (0..M) Операция
- Клиент (1) открывает (0..M) Вклад
- Счёт (1) относится (1) Банк
- Сотрудник (0..M) обслуживает (0..M) Счёт
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Bank(bank_id PK, name, bik UK, correspondent_account, address, phone),
Client(client_id PK, full_name, birth_date, phone, email, passport UK, address),
Account(account_id PK, account_number UK, open_date, close_date, account_type, currency, balance, status, client_id FK, bank_id FK),
Operation(operation_id PK, operation_date, amount, operation_type, description, status, account_id FK),
Deposit(deposit_id PK, contract_number UK, start_date, end_date, amount, interest_rate, client_id FK),
Employee(employee_id PK, full_name, position, phone, email, department),
AccountService(account_id PK FK, employee_id PK FK, service_date).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связи M:N через ассоциативную сущность AccountService.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, account_id функционально определяет данные счёта и ссылки на клиента и банк, client_id определяет данные клиента.

Проверка второй и третьей нормальных форм подтверждает отсутствие частичных и транзитивных зависимостей. Все атрибуты зависят только от первичного ключа своей сущности, а связанные характеристики вынесены в отдельные таблицы. Таким образом отсутствуют зависимости вида PK → non-key → non-key.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Bank (
    bank_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    bik VARCHAR(9) NOT NULL UNIQUE,
    correspondent_account VARCHAR(20),
    address TEXT,
    phone VARCHAR(20)
);
```

```sql
CREATE TABLE Client (
    client_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    passport VARCHAR(20) UNIQUE,
    address TEXT
);
```

```sql
CREATE TABLE Account (
    account_id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    open_date DATE NOT NULL DEFAULT CURRENT_DATE,
    close_date DATE,
    account_type VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'RUB',
    balance DECIMAL(16,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    client_id INT NOT NULL,
    bank_id INT NOT NULL,

    FOREIGN KEY (client_id) REFERENCES Client(client_id),
    FOREIGN KEY (bank_id) REFERENCES Bank(bank_id)
);
```

```sql
CREATE TABLE Operation (
    operation_id SERIAL PRIMARY KEY,
    operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(16,2) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    account_id INT NOT NULL,

    FOREIGN KEY (account_id) REFERENCES Account(account_id)
);
```

```sql
CREATE TABLE Deposit (
    deposit_id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount DECIMAL(16,2) CHECK (amount > 0),
    interest_rate DECIMAL(5,2) CHECK (interest_rate >= 0),
    client_id INT NOT NULL,

    FOREIGN KEY (client_id) REFERENCES Client(client_id),

    CHECK (end_date > start_date)
);
```

```sql
CREATE TABLE Employee (
    employee_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    department VARCHAR(200)
);
```

```sql
CREATE TABLE AccountService (
    account_id INT NOT NULL,
    employee_id INT NOT NULL,
    service_date DATE DEFAULT CURRENT_DATE,

    PRIMARY KEY (account_id, employee_id, service_date),

    FOREIGN KEY (account_id) REFERENCES Account(account_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_account_client
ON Account(client_id);

CREATE INDEX idx_account_bank
ON Account(bank_id);

CREATE INDEX idx_operation_account
ON Operation(account_id);

CREATE INDEX idx_deposit_client
ON Deposit(client_id);
```
### 4. SQL: команды управления данными
**Bank**
```sql
INSERT INTO Bank (name, bik, correspondent_account, address, phone)
VALUES ('Сбербанк', '044525225', '30101810400000000225', 'ул. Вавилова, 19', '111-111'),
       ('ВТБ', '044525745', '30101810300000000745', 'ул. Пресненская, 10', '222-222');
```

```sql
UPDATE Bank
SET name = 'Сбербанк России',
    bik = '044525225',
    phone = '333-333',
    address = 'ул. Кузнецкий мост, 9'
WHERE bank_id = 1;
```

```sql
DELETE FROM Bank WHERE bank_id = 2;
```

**Client**
```sql
INSERT INTO Client (full_name, phone, email, passport)
VALUES ('Иванов Иван Иванович', '111-111', 'ivanov@mail.ru', '4000 123456'),
       ('Петров Пётр Петрович', '222-222', 'petrov@mail.ru', '4000 654321');
```

```sql
UPDATE Client
SET full_name = 'Иванов И.И.',
    phone = '999-999',
    email = 'ivanov_new@mail.ru',
    passport = '4000 123456',
    address = 'ул. Ленина, 1'
WHERE client_id = 1;
```

```sql
DELETE FROM Client WHERE client_id = 2;
```

**Account**
```sql
INSERT INTO Account (account_number, open_date, account_type, currency, balance, client_id, bank_id)
VALUES ('40817810000000000001', '2020-01-15', 'дебетовая', 'RUB', 50000, 1, 1),
       ('40817810000000000002', '2021-06-01', 'кредитная', 'RUB', -15000, 1, 1);
```

```sql
UPDATE Account
SET account_number = '40817810000000000001-Н',
    open_date = '2020-01-15',
    account_type = 'дебетовая',
    currency = 'RUB',
    balance = 100000,
    status = 'active',
    client_id = 1,
    bank_id = 1
WHERE account_id = 1;
```

```sql
DELETE FROM Account WHERE account_id = 2;
```

**Operation**
```sql
INSERT INTO Operation (operation_date, amount, operation_type, description, account_id)
VALUES ('2024-09-01', 15000, 'deposit', 'Пополнение карты', 1),
       ('2024-09-05', 3000, 'withdrawal', 'Снятие в банкомате', 1);
```

```sql
UPDATE Operation
SET operation_date = '2024-09-02',
    amount = 20000,
    operation_type = 'deposit',
    description = 'Пополнение через кассу',
    status = 'completed',
    account_id = 1
WHERE operation_id = 1;
```

```sql
DELETE FROM Operation WHERE operation_id = 2;
```

**Deposit**
```sql
INSERT INTO Deposit (contract_number, start_date, end_date, amount, interest_rate, client_id)
VALUES ('ДЕП-2024-001', '2024-01-01', '2025-01-01', 500000, 12, 1),
       ('ДЕП-2024-002', '2024-06-01', '2025-06-01', 300000, 10, 1);
```

```sql
UPDATE Deposit
SET contract_number = 'ДЕП-2024-001-ИЗМ',
    start_date = '2024-02-01',
    end_date = '2025-02-01',
    amount = 600000,
    interest_rate = 13,
    client_id = 1
WHERE deposit_id = 1;
```

```sql
DELETE FROM Deposit WHERE deposit_id = 2;
```

**Employee**
```sql
INSERT INTO Employee (full_name, position, phone, email, department)
VALUES ('Сидорова Елена', 'Старший менеджер', '111-111', 'sidorova@sberbank.ru', 'Обслуживание'),
       ('Кузнецов Дмитрий', 'Консультант', '222-222', 'kuznetsov@sberbank.ru', 'Кредиты');
```

```sql
UPDATE Employee
SET full_name = 'Сидорова Е.В.',
    position = 'Руководитель отдела',
    phone = '333-333',
    email = 'sidorova_head@sberbank.ru',
    department = 'Обслуживание'
WHERE employee_id = 1;
```

```sql
DELETE FROM Employee WHERE employee_id = 2;
```

**AccountService**
```sql
INSERT INTO AccountService (account_id, employee_id, service_date)
VALUES (1, 1, '2024-09-01'),
       (1, 2, '2024-09-10');
```

```sql
DELETE FROM AccountService WHERE account_id = 1 AND employee_id = 2 AND service_date = '2024-09-10';
```

### 5. Триггеры

**Триггер бизнес-целостности**
Обновление баланса счёта при добавлении новой операции. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется изменение данных другой таблицы)
```sql
CREATE OR REPLACE FUNCTION update_balance_on_operation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.operation_type = 'deposit' THEN
        UPDATE Account
        SET balance = balance + NEW.amount
        WHERE account_id = NEW.account_id;
    ELSIF NEW.operation_type IN ('withdrawal', 'transfer_out') THEN
        UPDATE Account
        SET balance = balance - NEW.amount
        WHERE account_id = NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_update_balance_on_operation
AFTER INSERT ON Operation
FOR EACH ROW
EXECUTE FUNCTION update_balance_on_operation();
```

**Таблица аудита**
```sql
CREATE TABLE Operation_Audit (
    audit_id SERIAL PRIMARY KEY,
    operation_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_amount DECIMAL(16,2),
    new_amount DECIMAL(16,2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_operation_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Operation_Audit (
        operation_id,
        old_status,
        new_status,
        old_amount,
        new_amount,
        changed_by
    )
    VALUES (
        NEW.operation_id,
        OLD.status,
        NEW.status,
        OLD.amount,
        NEW.amount,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_operation_change
AFTER UPDATE ON Operation
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.amount IS DISTINCT FROM NEW.amount)
EXECUTE FUNCTION audit_operation_change();
```

### 6. Сложный SQL-запрос
Выписка по счёту за период: операции и остаток.
```sql
SELECT
    a.account_number,
    a.account_type,
    a.currency,
    o.operation_date,
    o.operation_type,
    o.amount,
    o.description,
    SUM(
        CASE
            WHEN o.operation_type = 'deposit' THEN o.amount
            WHEN o.operation_type IN ('withdrawal', 'transfer_out') THEN -o.amount
            ELSE 0
        END
    ) OVER (ORDER BY o.operation_date, o.operation_id) AS running_balance

FROM Account a

JOIN Operation o
    ON a.account_id = o.account_id

WHERE a.account_number = '40817810000000000001'
  AND o.operation_date BETWEEN '2024-09-01' AND '2024-09-30'
  AND o.status = 'completed'

ORDER BY o.operation_date, o.operation_id;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=bank_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

## Вариант 15. Игровой сервис
### 1. Инфологическая модель (ER-диаграмма Чена)
**Сущности:**
- Пользователь (id, ник, email, телефон, дата_регистрации, статус, рейтинг)
- Игра (id, название, жанр, дата_выхода, платформа, цена, возрастной_рейтинг)
- Достижение (id, название, описание, очки, тип, скрытое)
- Покупка (id, дата, цена_покупки, способ_оплаты)
- Отзыв (id, текст, оценка, дата, плюсы, минусы)
- Разработчик (id, название, страна, сайт, email, описание)
- Сервер (id, название, ip, порт, регион, статус, вместимость)

**Связи:**
- Пользователь (1) совершает (0..M) Покупка
- Игра (1) участвует в (0..M) Покупка
- Пользователь (0..M) получает (0..M) Достижение
- Пользователь (0..M) оставляет (0..M) Отзыв
- Игра (0..M) принадлежит (1) Разработчик
- Игра (0..M) размещается (0..M) Сервер
### 2. Физическая модель БД
Физическая модель реляционной базы данных включает набор отношений, соответствующих сущностям предметной области, с указанием первичных и внешних ключей. В рамках данной модели определены следующие таблицы: 

```
Developer(developer_id PK, name, country, website, email, description),
Game(game_id PK, name, genre, release_date, platform, price, age_rating, developer_id FK),
User(user_id PK, nickname UK, email UK, phone, registration_date, status, rating),
Purchase(purchase_id PK, purchase_date, price, payment_method, user_id FK, game_id FK),
Achievement(achievement_id PK, name, description, points, achievement_type, hidden, game_id FK),
UserAchievement(user_id PK FK, achievement_id PK FK, earned_date),
Review(review_id PK, text, rating, review_date, pros, cons, user_id FK, game_id FK),
Server(server_id PK, name, ip_address UK, port, region, status, capacity),
GameServer(game_id PK FK, server_id PK FK).
```

Данная структура полностью отражает связи ER-модели и реализует все отношения в виде реляционных таблиц с устранением связей M:N через ассоциативные сущности UserAchievement и GameServer.

Функциональные зависимости в данной предметной области определяются первичными ключами сущностей. Для каждой таблицы выполняется зависимость вида PK → все неключевые атрибуты. Например, game_id функционально определяет данные игры и разработчика, user_id определяет данные пользователя. Связующие таблицы UserAchievement и GameServer имеют составные первичные ключи без неключевых атрибутов (UserAchievement имеет earned_date как атрибут, зависящий от полного ключа).

Проверка второй нормальной формы показывает, что все неключевые атрибуты зависят от полного составного ключа, что исключает частичные зависимости. Проверка третьей нормальной формы показывает отсутствие транзитивных зависимостей — характеристики разработчика, пользователя и сервера вынесены в отдельные таблицы.

Следовательно, все отношения находятся в третьей нормальной форме, так как выполнены условия 1НФ (атомарность атрибутов), 2НФ (отсутствие частичных зависимостей) и 3НФ (отсутствие транзитивных зависимостей). Модель корректно нормализована и готова к реализации в реляционной СУБД без аномалий вставки, обновления и удаления.
### 3. SQL: структура БД, индексы.
```sql
CREATE TABLE Developer (
    developer_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100),
    website VARCHAR(500),
    email VARCHAR(100),
    description TEXT
);
```

```sql
CREATE TABLE Game (
    game_id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    genre VARCHAR(100),
    release_date DATE,
    platform VARCHAR(100),
    price DECIMAL(10,2) CHECK (price >= 0),
    age_rating VARCHAR(10),
    developer_id INT NOT NULL,

    FOREIGN KEY (developer_id) REFERENCES Developer(developer_id)
);
```

```sql
CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    registration_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active',
    rating INT DEFAULT 0
);
```

```sql
CREATE TABLE Purchase (
    purchase_id SERIAL PRIMARY KEY,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    price DECIMAL(10,2),
    payment_method VARCHAR(50),
    user_id INT NOT NULL,
    game_id INT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (game_id) REFERENCES Game(game_id)
);
```

```sql
CREATE TABLE Achievement (
    achievement_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points INT CHECK (points >= 0),
    achievement_type VARCHAR(50),
    hidden BOOLEAN DEFAULT FALSE,
    game_id INT NOT NULL,

    FOREIGN KEY (game_id) REFERENCES Game(game_id)
);
```

```sql
CREATE TABLE UserAchievement (
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_date DATE DEFAULT CURRENT_DATE,

    PRIMARY KEY (user_id, achievement_id),

    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (achievement_id) REFERENCES Achievement(achievement_id)
);
```

```sql
CREATE TABLE Review (
    review_id SERIAL PRIMARY KEY,
    text TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 10),
    review_date DATE DEFAULT CURRENT_DATE,
    pros TEXT,
    cons TEXT,
    user_id INT NOT NULL,
    game_id INT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (game_id) REFERENCES Game(game_id)
);
```

```sql
CREATE TABLE Server (
    server_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    port INT CHECK (port BETWEEN 1 AND 65535),
    region VARCHAR(100),
    status VARCHAR(50) DEFAULT 'online',
    capacity INT CHECK (capacity > 0)
);
```

```sql
CREATE TABLE GameServer (
    game_id INT NOT NULL,
    server_id INT NOT NULL,

    PRIMARY KEY (game_id, server_id),

    FOREIGN KEY (game_id) REFERENCES Game(game_id),
    FOREIGN KEY (server_id) REFERENCES Server(server_id)
);
```

Индексы создаются для ускорения операций соединения таблиц (JOIN) и поиска по внешним ключам. Первичные ключи индексируются автоматически, поэтому дополнительные индексы добавлены только для внешних ключей.

```sql
CREATE INDEX idx_game_developer
ON Game(developer_id);

CREATE INDEX idx_purchase_user
ON Purchase(user_id);

CREATE INDEX idx_purchase_game
ON Purchase(game_id);

CREATE INDEX idx_achievement_game
ON Achievement(game_id);

CREATE INDEX idx_review_user
ON Review(user_id);

CREATE INDEX idx_review_game
ON Review(game_id);
```
### 4. SQL: команды управления данными
**Developer**
```sql
INSERT INTO Developer (name, country, website, email)
VALUES ('Valve', 'США', 'https://valvesoftware.com', 'info@valve.com'),
       ('CD Projekt Red', 'Польша', 'https://cdprojektred.com', 'info@cdpr.com');
```

```sql
UPDATE Developer
SET name = 'Valve Corporation',
    country = 'США',
    website = 'https://valvesoftware.com',
    email = 'contact@valve.com',
    description = 'Разработчик Steam и Half-Life'
WHERE developer_id = 1;
```

```sql
DELETE FROM Developer WHERE developer_id = 2;
```

**Game**
```sql
INSERT INTO Game (name, genre, release_date, platform, price, age_rating, developer_id)
VALUES ('Half-Life 2', 'FPS', '2004-11-16', 'PC', 9.99, '16+', 1),
       ('Portal 2', 'Puzzle', '2011-04-19', 'PC', 9.99, '12+', 1);
```

```sql
UPDATE Game
SET name = 'Half-Life 2: Anniversary',
    genre = 'FPS',
    release_date = '2004-11-16',
    platform = 'PC',
    price = 4.99,
    age_rating = '16+',
    developer_id = 1
WHERE game_id = 1;
```

```sql
DELETE FROM Game WHERE game_id = 2;
```

**User**
```sql
INSERT INTO "User" (nickname, email, phone)
VALUES ('gamer2024', 'gamer@mail.ru', '111-111'),
       ('pro_player', 'pro@mail.ru', '222-222');
```

```sql
UPDATE "User"
SET nickname = 'gamer_2024_pro',
    email = 'gamer_pro@mail.ru',
    phone = '333-333',
    status = 'vip',
    rating = 100
WHERE user_id = 1;
```

```sql
DELETE FROM "User" WHERE user_id = 2;
```

**Purchase**
```sql
INSERT INTO Purchase (purchase_date, price, payment_method, user_id, game_id)
VALUES ('2024-09-01', 9.99, 'card', 1, 1),
       ('2024-09-05', 4.99, 'wallet', 1, 2);
```

```sql
UPDATE Purchase
SET purchase_date = '2024-09-02',
    price = 4.99,
    payment_method = 'card',
    user_id = 1,
    game_id = 1
WHERE purchase_id = 1;
```

```sql
DELETE FROM Purchase WHERE purchase_id = 2;
```

**Achievement**
```sql
INSERT INTO Achievement (name, description, points, game_id)
VALUES ('Welcome to City 17', 'Начать игру Half-Life 2', 10, 1),
       ('Bug Hunt', 'Уничтожить 100 муравольвов', 25, 1);
```

```sql
UPDATE Achievement
SET name = 'Welcome to Ravenholm',
    description = 'Добраться до Рейвенхольма',
    points = 15,
    achievement_type = 'story',
    hidden = FALSE,
    game_id = 1
WHERE achievement_id = 1;
```

```sql
DELETE FROM Achievement WHERE achievement_id = 2;
```

**UserAchievement**
```sql
INSERT INTO UserAchievement (user_id, achievement_id, earned_date)
VALUES (1, 1, '2024-09-02'),
       (1, 2, '2024-09-03');
```

```sql
DELETE FROM UserAchievement WHERE user_id = 1 AND achievement_id = 2;
```

**Review**
```sql
INSERT INTO Review (text, rating, pros, cons, user_id, game_id)
VALUES ('Отличная игра!', 10, 'Геймплей, сюжет', 'Графика устарела', 1, 1),
       ('Шедевр головоломок', 9, 'Механики, юмор', 'Короткая', 1, 2);
```

```sql
UPDATE Review
SET text = 'Лучшая игра всех времён!',
    rating = 10,
    pros = 'Геймплей, сюжет, атмосфера',
    cons = 'Нет',
    user_id = 1,
    game_id = 1
WHERE review_id = 1;
```

```sql
DELETE FROM Review WHERE review_id = 2;
```

**Server**
```sql
INSERT INTO Server (name, ip_address, port, region, status, capacity)
VALUES ('EU-West-01', '192.168.1.1', 27015, 'Europe', 'online', 64),
       ('US-East-01', '192.168.2.1', 27015, 'USA', 'online', 64);
```

```sql
UPDATE Server
SET name = 'EU-West-Main',
    ip_address = '10.0.0.1',
    port = 27016,
    region = 'Europe',
    status = 'maintenance',
    capacity = 128
WHERE server_id = 1;
```

```sql
DELETE FROM Server WHERE server_id = 2;
```

**GameServer**
```sql
INSERT INTO GameServer (game_id, server_id)
VALUES (1, 1),
       (1, 2);
```

```sql
DELETE FROM GameServer WHERE game_id = 1 AND server_id = 2;
```

### 5. Триггеры

**Триггер бизнес-целостности**
Автоматическое повышение рейтинга пользователя при получении достижений. (это нельзя выразить CHECK/FOREIGN KEY, т.к. требуется изменение данных другой таблицы на основе агрегации)
```sql
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "User"
    SET rating = (
        SELECT COALESCE(SUM(a.points), 0)
        FROM UserAchievement ua
        JOIN Achievement a ON ua.achievement_id = a.achievement_id
        WHERE ua.user_id = NEW.user_id
    )
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_update_user_rating
AFTER INSERT OR DELETE ON UserAchievement
FOR EACH ROW
EXECUTE FUNCTION update_user_rating();
```

**Таблица аудита**
```sql
CREATE TABLE Review_Audit (
    audit_id SERIAL PRIMARY KEY,
    review_id INT,
    old_rating INT,
    new_rating INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100)
);
```

**Триггер аудита**
```sql
CREATE OR REPLACE FUNCTION audit_review_rating()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Review_Audit (
        review_id,
        old_rating,
        new_rating,
        changed_by
    )
    VALUES (
        NEW.review_id,
        OLD.rating,
        NEW.rating,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER trg_audit_review_rating
AFTER UPDATE ON Review
FOR EACH ROW
WHEN (OLD.rating IS DISTINCT FROM NEW.rating)
EXECUTE FUNCTION audit_review_rating();
```

### 6. Сложный SQL-запрос
Каталог игр с оценками, количеством покупок и доступными серверами.
```sql
SELECT
    g.name AS game,
    g.genre,
    g.price,
    g.age_rating,
    d.name AS developer,
    COUNT(DISTINCT p.purchase_id) AS total_purchases,
    COUNT(DISTINCT r.review_id) AS total_reviews,
    ROUND(AVG(r.rating), 1) AS avg_rating,
    STRING_AGG(DISTINCT s.name, ', ') AS servers

FROM Game g

JOIN Developer d
    ON g.developer_id = d.developer_id

LEFT JOIN Purchase p
    ON g.game_id = p.game_id

LEFT JOIN Review r
    ON g.game_id = r.game_id

LEFT JOIN GameServer gs
    ON g.game_id = gs.game_id

LEFT JOIN Server s
    ON gs.server_id = s.server_id

WHERE g.price > 0

GROUP BY
    g.game_id,
    g.name,
    g.genre,
    g.price,
    g.age_rating,
    d.name

ORDER BY avg_rating DESC NULLS LAST, total_purchases DESC;
```
### 7. Код на шарпах 
Для SQL запросов см. 3 и 4 пункты
```csharp
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        using var conn = new NpgsqlConnection("Host=localhost;Username=postgres;Password=1234;Database=game_db");
        conn.Open();
        Execute(conn, SQL.CreateTables);
        Execute(conn, SQL.InsertData);
        Execute(conn, SQL.ModifyData);
        ExecuteQuery(conn, SQL.ReportQuery);
        conn.Close();
    }

    static void Execute(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    static void ExecuteQuery(NpgsqlConnection conn, string sql)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            Console.WriteLine(reader[0]);
    }
}
```

# Задачи на алгоритмы

## Задача 1. Антиплагиат аннотаций: полиномиальные хеши
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

public class PolyHash
{
    private readonly long[] _pref;
    private readonly long[] _powb;
    private readonly long _mod;
    private readonly long _base;

    public PolyHash(string s, long b = 911, long mod = 1_000_000_007L)
    {
        _base = b;
        _mod = mod;
        int n = s.Length;
        _pref = new long[n + 1];
        _powb = new long[n + 1];
        _powb[0] = 1;
        for (int i = 0; i < n; i++)
        {
            _pref[i + 1] = (_pref[i] * _base + s[i]) % _mod;
            _powb[i + 1] = (_powb[i] * _base) % _mod;
        }
    }

    public long GetHash(int l, int r)
    {
        return ((_pref[r] - _pref[l] * _powb[r - l]) % _mod + _mod) % _mod;
    }
}

public static class Plagiarism
{
    private static string Normalize(string s)
    {
        s = s.ToLower();
        s = Regex.Replace(s, @"[^\w\s]", "");
        s = Regex.Replace(s, @"\s+", " ").Trim();
        return s;
    }

    public static List<(int, int, string)> FindPlagiarism(List<string> annotations, int L)
    {
        var normed = annotations.Select(Normalize).ToList();
        int n = normed.Count;

        var annHashes1 = new List<HashSet<long>>();
        var annHashes2 = new List<HashSet<long>>();

        foreach (var s in normed)
        {
            if (s.Length < L)
            {
                annHashes1.Add(new HashSet<long>());
                annHashes2.Add(new HashSet<long>());
                continue;
            }
            var ph1 = new PolyHash(s, 911, 1_000_000_007L);
            var ph2 = new PolyHash(s, 131, 1_000_000_009L);
            var hs1 = new HashSet<long>();
            var hs2 = new HashSet<long>();
            for (int i = 0; i <= s.Length - L; i++)
            {
                hs1.Add(ph1.GetHash(i, i + L));
                hs2.Add(ph2.GetHash(i, i + L));
            }
            annHashes1.Add(hs1);
            annHashes2.Add(hs2);
        }

        var results = new List<(int, int, string)>();
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (!annHashes1[i].Overlaps(annHashes1[j])) continue;
                for (int start = 0; start <= normed[i].Length - L; start++)
                {
                    string frag = normed[i].Substring(start, L);
                    if (normed[j].Contains(frag))
                    {
                        results.Add((i, j, frag));
                        break;
                    }
                }
            }
        }
        return results;
    }
}
```

## Задача 2. Поиск шаблона в тексте: префикс-функция и КМП
```csharp
public static class KMP
{
    public static int[] PrefixFunction(string pattern)
    {
        int m = pattern.Length;
        var pi = new int[m];
        for (int i = 1; i < m; i++)
        {
            int j = pi[i - 1];
            while (j > 0 && pattern[i] != pattern[j])
                j = pi[j - 1];
            if (pattern[i] == pattern[j])
                j++;
            pi[i] = j;
        }
        return pi;
    }

    public static List<int> Search(string text, string pattern)
    {
        int n = text.Length, m = pattern.Length;
        var positions = new List<int>();
        if (m == 0) return positions;

        var pi = PrefixFunction(pattern);
        int matched = 0;
        for (int i = 0; i < n; i++)
        {
            while (matched > 0 && text[i] != pattern[matched])
                matched = pi[matched - 1];
            if (text[i] == pattern[matched])
                matched++;
            if (matched == m)
            {
                positions.Add(i - m + 1);
                matched = pi[matched - 1];
            }
        }
        return positions;
    }
}
```

## Задача 3. Префиксные совпадения: Z-функция
```csharp
public static class ZFunc
{
    public static int[] ZFunction(string s)
    {
        int n = s.Length;
        var z = new int[n];
        int l = 0, r = 0;
        for (int i = 1; i < n; i++)
        {
            if (i <= r)
                z[i] = Math.Min(r - i + 1, z[i - l]);
            while (i + z[i] < n && s[z[i]] == s[i + z[i]])
                z[i]++;
            if (i + z[i] - 1 > r)
            {
                l = i;
                r = i + z[i] - 1;
            }
        }
        return z;
    }

    public static List<int> PrefixSuffixLengths(string s)
    {
        var z = ZFunction(s);
        int n = s.Length;
        var lengths = new List<int>();
        for (int i = 1; i < n; i++)
        {
            if (z[i] == n - i)
                lengths.Add(z[i]);
        }
        lengths.Add(n);
        lengths.Sort();
        return lengths;
    }
}
```


## Задача 4. Автодополнение: Бор
```csharp
public class TrieNode
{
    public Dictionary<char, TrieNode> Children = new();
    public bool IsEnd;
}

public class Trie
{
    private readonly TrieNode _root = new();

    public void Insert(string word)
    {
        var node = _root;
        foreach (char ch in word)
        {
            if (!node.Children.ContainsKey(ch))
                node.Children[ch] = new TrieNode();
            node = node.Children[ch];
        }
        node.IsEnd = true;
    }

    private void Dfs(TrieNode node, string prefix, int limit, List<string> result)
    {
        if (result.Count >= limit) return;
        if (node.IsEnd) result.Add(prefix);
        foreach (char ch in node.Children.Keys.OrderBy(c => c))
        {
            if (result.Count >= limit) break;
            Dfs(node.Children[ch], prefix + ch, limit, result);
        }
    }

    public List<string> Autocomplete(string prefix, int k)
    {
        var node = _root;
        foreach (char ch in prefix)
        {
            if (!node.Children.ContainsKey(ch)) return new List<string>();
            node = node.Children[ch];
        }
        var result = new List<string>();
        Dfs(node, prefix, k, result);
        return result;
    }
}
```

## Задача 5. Фильтр материалов: Ахо-Корасик
```csharp
// ИСПРАВЛЕНИЕ: убрано extend(fail.output) при построении — дублировало
// шаблоны. Поиск теперь собирает выходы через dict-ссылку правильно.
public class AhoCorasick
{
    private class AcNode
    {
        public int[] Next = new int[128];
        public int Fail;
        public List<int> Output = new();
        public int Dict; // ближайший предок (по fail) с непустым Output

        public AcNode() { Array.Fill(Next, -1); Dict = -1; }
    }

    private readonly List<AcNode> _nodes = new();
    private readonly List<string> _patterns;

    public AhoCorasick(List<string> patterns)
    {
        _patterns = patterns;
        _nodes.Add(new AcNode()); // root = 0
        BuildTrie();
        BuildLinks();
    }

    private void BuildTrie()
    {
        for (int idx = 0; idx < _patterns.Count; idx++)
        {
            int cur = 0;
            foreach (char ch in _patterns[idx])
            {
                int c = ch;
                if (_nodes[cur].Next[c] == -1)
                {
                    _nodes[cur].Next[c] = _nodes.Count;
                    _nodes.Add(new AcNode());
                }
                cur = _nodes[cur].Next[c];
            }
            _nodes[cur].Output.Add(idx);
        }
    }

    private void BuildLinks()
    {
        var q = new Queue<int>();
        // Дети корня: fail = 0
        for (int c = 0; c < 128; c++)
        {
            int ch = _nodes[0].Next[c];
            if (ch == -1) { _nodes[0].Next[c] = 0; continue; }
            _nodes[ch].Fail = 0;
            q.Enqueue(ch);
        }

        while (q.Count > 0)
        {
            int u = q.Dequeue();
            // Dict-ссылка
            int failU = _nodes[u].Fail;
            _nodes[u].Dict = _nodes[failU].Output.Count > 0
                ? failU
                : _nodes[failU].Dict;

            for (int c = 0; c < 128; c++)
            {
                int v = _nodes[u].Next[c];
                if (v == -1)
                {
                    // Перейти по fail-цепочке (автомат)
                    _nodes[u].Next[c] = _nodes[_nodes[u].Fail].Next[c];
                }
                else
                {
                    _nodes[v].Fail = _nodes[_nodes[u].Fail].Next[c];
                    q.Enqueue(v);
                }
            }
        }
    }

    // Возвращает словарь: индекс шаблона -> список позиций начала вхождения
    public Dictionary<int, List<int>> Search(string text)
    {
        var result = new Dictionary<int, List<int>>();
        for (int i = 0; i < _patterns.Count; i++)
            result[i] = new List<int>();

        int state = 0;
        for (int pos = 0; pos < text.Length; pos++)
        {
            int c = text[pos];
            if (c < 128) state = _nodes[state].Next[c];
            else state = 0;

            // Собираем выходы текущего узла + по dict-цепочке
            int tmp = state;
            while (tmp > 0)
            {
                foreach (int patIdx in _nodes[tmp].Output)
                    result[patIdx].Add(pos - _patterns[patIdx].Length + 1);
                tmp = _nodes[tmp].Dict; // -1 означает нет dict-ссылки
                if (tmp == -1) break;
            }
        }
        return result;
    }
}
```

## Задача 6. Наидлиннейший общий подстрочный фрагмент
```csharp
public static class SuffixArray
{
    public static int[] Build(string s)
    {
        int n = s.Length;
        var sa = Enumerable.Range(0, n).ToArray();
        var rank = s.Select(c => (int)c).ToArray();
        var tmp = new int[n];

        for (int k = 1; k < n; k <<= 1)
        {
            int kk = k; // capture for lambda
            var rankCopy = rank.ToArray();
            Array.Sort(sa, (x, y) =>
            {
                if (rankCopy[x] != rankCopy[y]) return rankCopy[x] - rankCopy[y];
                int rx = x + kk < n ? rankCopy[x + kk] : -1;
                int ry = y + kk < n ? rankCopy[y + kk] : -1;
                return rx - ry;
            });
            tmp[sa[0]] = 0;
            for (int i = 1; i < n; i++)
            {
                int prev = sa[i - 1], cur = sa[i];
                int rp = prev + kk < n ? rankCopy[prev + kk] : -1;
                int rc = cur + kk < n ? rankCopy[cur + kk] : -1;
                tmp[cur] = tmp[prev] + (rankCopy[prev] != rankCopy[cur] || rp != rc ? 1 : 0);
            }
            rank = tmp.ToArray();
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    // Алгоритм Касаи для построения LCP
    public static int[] BuildLCP(string s, int[] sa)
    {
        int n = s.Length;
        var rank = new int[n];
        for (int i = 0; i < n; i++) rank[sa[i]] = i;

        var lcp = new int[n - 1];
        int k = 0;
        for (int i = 0; i < n; i++)
        {
            if (rank[i] == n - 1) { k = 0; continue; }
            int j = sa[rank[i] + 1];
            while (i + k < n && j + k < n && s[i + k] == s[j + k]) k++;
            lcp[rank[i]] = k;
            if (k > 0) k--;
        }
        return lcp;
    }

    public static string LongestCommonSubstring(string a, string b)
    {
        string s = a + "#" + b;
        int n1 = a.Length;
        var sa = Build(s);
        var lcp = BuildLCP(s, sa);

        int maxLen = 0, pos = 0;
        for (int i = 0; i < lcp.Length; i++)
        {
            if (lcp[i] > maxLen && (sa[i] < n1) != (sa[i + 1] < n1))
            {
                maxLen = lcp[i];
                pos = sa[i];
            }
        }
        return s.Substring(pos, maxLen);
    }
```

## Задача 7. Количество различных подстрок
```csharp
    public static long CountDistinctSubstrings(string s)
    {
        int n = s.Length;
        var sa = Build(s);
        var lcp = BuildLCP(s, sa);
        long total = (long)n * (n + 1) / 2;
        return total - lcp.Sum();
    }
}
```


## Задача 8. Топологическая сортировка (алгоритм Кана)
```csharp
// ИСПРАВЛЕНИЕ: поиск цикла через DFS-цвета теперь правильно
// восстанавливает весь цикл по стеку пути.
public static class TopologicalSort
{
    public static (List<int>? order, List<int>? cycle) Sort(int n, List<(int, int)> edges)
    {
        var adj = new List<List<int>>();
        var indeg = new int[n];
        for (int i = 0; i < n; i++) adj.Add(new List<int>());

        foreach (var (u, v) in edges)
        {
            adj[u].Add(v);
            indeg[v]++;
        }

        var q = new Queue<int>(Enumerable.Range(0, n).Where(v => indeg[v] == 0));
        var order = new List<int>();
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            order.Add(u);
            foreach (int v in adj[u])
                if (--indeg[v] == 0) q.Enqueue(v);
        }

        if (order.Count == n) return (order, null);

        // Найти цикл через DFS с цветами
        const int WHITE = 0, GRAY = 1, BLACK = 2;
        var color = new int[n];
        var path = new List<int>();
        List<int>? foundCycle = null;

        bool Dfs(int u)
        {
            color[u] = GRAY;
            path.Add(u);
            foreach (int v in adj[u])
            {
                if (color[v] == GRAY)
                {
                    // Восстанавливаем цикл из стека
                    int startIdx = path.IndexOf(v);
                    foundCycle = path.GetRange(startIdx, path.Count - startIdx);
                    foundCycle.Add(v); // замкнуть цикл
                    return true;
                }
                if (color[v] == WHITE && Dfs(v)) return true;
            }
            path.RemoveAt(path.Count - 1);
            color[u] = BLACK;
            return false;
        }

        for (int v = 0; v < n; v++)
            if (color[v] == WHITE && Dfs(v)) break;

        return (null, foundCycle);
    }
}
```

## Задача 9. Компоненты сильной связности (Косарайю)
```csharp
// ИСПРАВЛЕНИЕ: заменён рекурсивный DFS на итеративный
// во избежание переполнения стека на больших графах.
public static class SCC
{
    public static (int[] comp, List<HashSet<int>> condAdj, List<int> sources) Kosaraju(
        int n, List<List<int>> adj)
    {
        // 1-й проход: порядок завершения (итеративный DFS)
        var visited = new bool[n];
        var order = new List<int>();

        for (int start = 0; start < n; start++)
        {
            if (visited[start]) continue;
            var stack = new Stack<(int node, int idx)>();
            stack.Push((start, 0));
            visited[start] = true;
            while (stack.Count > 0)
            {
                var (u, i) = stack.Pop();
                if (i < adj[u].Count)
                {
                    stack.Push((u, i + 1));
                    int v = adj[u][i];
                    if (!visited[v])
                    {
                        visited[v] = true;
                        stack.Push((v, 0));
                    }
                }
                else
                {
                    order.Add(u);
                }
            }
        }

        // Обратный граф
        var radj = new List<List<int>>();
        for (int i = 0; i < n; i++) radj.Add(new List<int>());
        for (int u = 0; u < n; u++)
            foreach (int v in adj[u]) radj[v].Add(u);

        // 2-й проход: компоненты
        var comp = new int[n];
        Array.Fill(comp, -1);
        int cid = 0;

        for (int i = order.Count - 1; i >= 0; i--)
        {
            int start = order[i];
            if (comp[start] != -1) continue;
            var stack = new Stack<int>();
            stack.Push(start);
            comp[start] = cid;
            while (stack.Count > 0)
            {
                int u = stack.Pop();
                foreach (int v in radj[u])
                    if (comp[v] == -1) { comp[v] = cid; stack.Push(v); }
            }
            cid++;
        }

        // Граф конденсации
        var condAdj = new List<HashSet<int>>();
        for (int i = 0; i < cid; i++) condAdj.Add(new HashSet<int>());
        for (int u = 0; u < n; u++)
            foreach (int v in adj[u])
                if (comp[u] != comp[v]) condAdj[comp[u]].Add(comp[v]);

        // Источники (нет входящих)
        var indeg = new int[cid];
        for (int u = 0; u < cid; u++)
            foreach (int v in condAdj[u]) indeg[v]++;
        var sources = Enumerable.Range(0, cid).Where(c => indeg[c] == 0).ToList();

        return (comp, condAdj, sources);
    }
}
```

## Задача 10. Дейкстра
```csharp
public static class Dijkstra
{
    public static (long[] dist, int[] parent) Run(List<List<(int to, int w)>> adj, int start)
    {
        int n = adj.Count;
        const long INF = long.MaxValue / 2;
        var dist = new long[n];
        Array.Fill(dist, INF);
        var parent = new int[n];
        Array.Fill(parent, -1);
        dist[start] = 0;

        // (distance, node)
        var pq = new SortedSet<(long d, int u)>(Comparer<(long, int)>.Create(
            (a, b) => a.d != b.d ? a.d.CompareTo(b.d) : a.u.CompareTo(b.u)));
        pq.Add((0, start));

        while (pq.Count > 0)
        {
            var (d, u) = pq.Min;
            pq.Remove(pq.Min);
            if (d > dist[u]) continue;
            foreach (var (v, w) in adj[u])
            {
                if (dist[u] + w < dist[v])
                {
                    pq.Remove((dist[v], v));
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.Add((dist[v], v));
                }
            }
        }
        return (dist, parent);
    }

    public static List<int> RestorePath(int[] parent, int target)
    {
        var path = new List<int>();
        for (int v = target; v != -1; v = parent[v]) path.Add(v);
        path.Reverse();
        return path.Count == 1 && parent[target] == -1 && path[0] != target
            ? new List<int>() : path;
    }
}
```

## Задача 11. MST: Крускал + Прим
```csharp
public class DSU
{
    private readonly int[] _parent, _rank;
    public DSU(int n) { _parent = Enumerable.Range(0, n).ToArray(); _rank = new int[n]; }
    public int Find(int x)
    {
        while (_parent[x] != x) { _parent[x] = _parent[_parent[x]]; x = _parent[x]; }
        return x;
    }
    public bool Union(int a, int b)
    {
        a = Find(a); b = Find(b);
        if (a == b) return false;
        if (_rank[a] < _rank[b]) (a, b) = (b, a);
        _parent[b] = a;
        if (_rank[a] == _rank[b]) _rank[a]++;
        return true;
    }
}

public static class MST
{
    public static (List<(int, int, int)> edges, long cost) Kruskal(
        int n, List<(int u, int v, int w)> edges)
    {
        edges.Sort((a, b) => a.w - b.w);
        var dsu = new DSU(n);
        var mst = new List<(int, int, int)>();
        long total = 0;
        foreach (var (u, v, w) in edges)
            if (dsu.Union(u, v)) { mst.Add((u, v, w)); total += w; }
        return (mst, total);
    }

    public static (List<(int, int, int)> edges, long cost) Prim(
        List<List<(int to, int w)>> adj, int start = 0)
    {
        int n = adj.Count;
        var visited = new bool[n];
        var pq = new SortedSet<(int w, int u, int parent)>(
            Comparer<(int, int, int)>.Create((a, b) =>
                a.w != b.w ? a.w - b.w : (a.u != b.u ? a.u - b.u : a.parent - b.parent)));
        pq.Add((0, start, -1));
        var mst = new List<(int, int, int)>();
        long total = 0;

        while (pq.Count > 0)
        {
            var (w, u, par) = pq.Min; pq.Remove(pq.Min);
            if (visited[u]) continue;
            visited[u] = true;
            total += w;
            if (par != -1) mst.Add((par, u, w));
            foreach (var (v, w2) in adj[u])
                if (!visited[v]) pq.Add((w2, v, u));
        }
        return (mst, total);
    }
}
```

## Задача 12. Точки сочленения и мосты
```csharp
// ИСПРАВЛЕНИЕ: учёт мультирёбер через индекс родительского ребра,
// а не через вершину-родителя.
public static class Bridges
{
    public static (HashSet<int> artPoints, List<(int, int)> bridges)
        Find(int n, List<List<(int to, int edgeIdx)>> adj)
    {
        var tin = new int[n];
        var low = new int[n];
        var visited = new bool[n];
        int timer = 0;
        var artPoints = new HashSet<int>();
        var bridgesList = new List<(int, int)>();

        void Dfs(int u, int parentEdge)
        {
            visited[u] = true;
            tin[u] = low[u] = timer++;
            int children = 0;
            foreach (var (v, eIdx) in adj[u])
            {
                if (eIdx == parentEdge) continue; // пропускаем ребро, по которому пришли
                if (visited[v])
                {
                    low[u] = Math.Min(low[u], tin[v]);
                }
                else
                {
                    Dfs(v, eIdx);
                    low[u] = Math.Min(low[u], low[v]);
                    if (low[v] >= tin[u] && parentEdge != -1)
                        artPoints.Add(u);
                    if (low[v] > tin[u])
                        bridgesList.Add((u, v));
                    children++;
                }
            }
            if (parentEdge == -1 && children > 1)
                artPoints.Add(u);
        }

        for (int u = 0; u < n; u++)
            if (!visited[u]) Dfs(u, -1);

        return (artPoints, bridgesList);
    }
}
```

## Задача 13. Раскраска графа: эвристика Уэлша-Пауэлла
```csharp
public static class GraphColoring
{
    public static (int[] color, int numColors) WelshPowell(int n, List<List<int>> adj)
    {
        var vertices = Enumerable.Range(0, n)
            .OrderByDescending(v => adj[v].Count)
            .ToList();
        var color = new int[n];
        Array.Fill(color, -1);
        int usedColors = 0;

        foreach (int v in vertices)
        {
            if (color[v] != -1) continue;
            usedColors++;
            color[v] = usedColors;
            // Собираем занятые цвета соседей
            foreach (int u in vertices)
            {
                if (color[u] != -1) continue;
                bool neighborHasColor = adj[u].Any(w => color[w] == usedColors);
                if (!neighborHasColor) color[u] = usedColors;
            }
        }
        return (color, usedColors);
    }
}
```


## Задача 14. Алгоритм Куна (двудольный граф)
```csharp
public static class BipartiteMatching
{
    private static int[] _matchTo = Array.Empty<int>();
    private static List<List<int>> _prefs = new();

    private static bool Dfs(int student, bool[] seen)
    {
        foreach (int proj in _prefs[student])
        {
            if (seen[proj]) continue;
            seen[proj] = true;
            if (_matchTo[proj] == -1 || Dfs(_matchTo[proj], seen))
            {
                _matchTo[proj] = student;
                return true;
            }
        }
        return false;
    }

    public static List<(int student, int proj)> Kuhn(
        int nStudents, int nProjects, List<List<int>> preferences)
    {
        _prefs = preferences;
        _matchTo = new int[nProjects];
        Array.Fill(_matchTo, -1);

        for (int s = 0; s < nStudents; s++)
        {
            var seen = new bool[nProjects];
            Dfs(s, seen);
        }

        return _matchTo
            .Select((student, proj) => (student, proj))
            .Where(x => x.student != -1)
            .ToList();
    }
}
```


## Задача 16. Эдмондс-Карп
```csharp
// ИСПРАВЛЕНИЕ: хранение индексов обратных рёбер для O(1)-обновления
// вместо повторного поиска по списку.
public class MaxFlow
{
    private struct Edge { public int To, Rev, Cap; }

    private readonly List<List<Edge>> _graph;
    private readonly int _n;

    public MaxFlow(int n) { _n = n; _graph = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap)
    {
        _graph[from].Add(new Edge { To = to, Rev = _graph[to].Count, Cap = cap });
        _graph[to].Add(new Edge { To = from, Rev = _graph[from].Count - 1, Cap = 0 });
    }

    private bool Bfs(int s, int t, int[] parent, int[] parentEdge)
    {
        Array.Fill(parent, -1);
        parent[s] = s;
        var q = new Queue<int>();
        q.Enqueue(s);
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            for (int i = 0; i < _graph[u].Count; i++)
            {
                var e = _graph[u][i];
                if (parent[e.To] == -1 && e.Cap > 0)
                {
                    parent[e.To] = u;
                    parentEdge[e.To] = i;
                    if (e.To == t) return true;
                    q.Enqueue(e.To);
                }
            }
        }
        return false;
    }

    public int EdmondsKarp(int s, int t)
    {
        int flow = 0;
        var parent = new int[_n];
        var parentEdge = new int[_n];

        while (Bfs(s, t, parent, parentEdge))
        {
            // Узкое место
            int aug = int.MaxValue;
            for (int v = t; v != s;)
            {
                int u = parent[v];
                aug = Math.Min(aug, _graph[u][parentEdge[v]].Cap);
                v = u;
            }
            // Проталкиваем
            for (int v = t; v != s;)
            {
                int u = parent[v];
                int i = parentEdge[v];
                var e = _graph[u][i];
                e.Cap -= aug;
                _graph[u][i] = e;
                var re = _graph[e.To][e.Rev];
                re.Cap += aug;
                _graph[e.To][e.Rev] = re;
                v = u;
            }
            flow += aug;
        }
        return flow;
    }

    // Минимальный разрез: вершины, достижимые из s в остаточной сети
    public HashSet<int> MinCutSide(int s)
    {
        var reachable = new HashSet<int>();
        var stack = new Stack<int>();
        stack.Push(s);
        reachable.Add(s);
        while (stack.Count > 0)
        {
            int u = stack.Pop();
            foreach (var e in _graph[u])
                if (!reachable.Contains(e.To) && e.Cap > 0)
                {
                    reachable.Add(e.To);
                    stack.Push(e.To);
                }
        }
        return reachable;
    }
}
```

## Задача 17. Диниц
```csharp
public class Dinic
{
    private struct Edge { public int To, Rev, Cap; }

    private readonly List<List<Edge>> _g;
    private int[] _level = Array.Empty<int>();
    private int[] _iter = Array.Empty<int>();
    private readonly int _n;

    public Dinic(int n) { _n = n; _g = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap)
    {
        _g[from].Add(new Edge { To = to, Rev = _g[to].Count, Cap = cap });
        _g[to].Add(new Edge { To = from, Rev = _g[from].Count - 1, Cap = 0 });
    }

    private bool Bfs(int s, int t)
    {
        _level = new int[_n];
        Array.Fill(_level, -1);
        _level[s] = 0;
        var q = new Queue<int>();
        q.Enqueue(s);
        while (q.Count > 0)
        {
            int u = q.Dequeue();
            foreach (var e in _g[u])
                if (e.Cap > 0 && _level[e.To] < 0)
                {
                    _level[e.To] = _level[u] + 1;
                    q.Enqueue(e.To);
                }
        }
        return _level[t] >= 0;
    }

    private int Dfs(int u, int t, int f)
    {
        if (u == t) return f;
        for (; _iter[u] < _g[u].Count; _iter[u]++)
        {
            var e = _g[u][_iter[u]];
            if (e.Cap > 0 && _level[u] + 1 == _level[e.To])
            {
                int pushed = Dfs(e.To, t, Math.Min(f, e.Cap));
                if (pushed > 0)
                {
                    var fwd = _g[u][_iter[u]];
                    fwd.Cap -= pushed;
                    _g[u][_iter[u]] = fwd;
                    var bwd = _g[e.To][e.Rev];
                    bwd.Cap += pushed;
                    _g[e.To][e.Rev] = bwd;
                    return pushed;
                }
            }
        }
        return 0;
    }

    public long MaxFlow(int s, int t)
    {
        long flow = 0;
        while (Bfs(s, t))
        {
            _iter = new int[_n];
            int pushed;
            while ((pushed = Dfs(s, t, int.MaxValue)) > 0)
                flow += pushed;
        }
        return flow;
    }
}
```


## Задача 19. Венгерский алгоритм
```csharp
// ИСПРАВЛЕНИЕ: итоговая стоимость вычисляется как сумма
// cost[i][assignment[i]], а не через потенциал v[0].
public static class Hungarian
{
    public static (int[] assignment, long totalCost) Solve(int[][] cost)
    {
        int n = cost.Length, m = cost[0].Length;
        var u = new long[n + 1];
        var v = new long[m + 1];
        var p = new int[m + 1];   // какой студент (1-индекс) назначен на проект j
        var way = new int[m + 1];

        for (int i = 1; i <= n; i++)
        {
            p[0] = i;
            int j0 = 0;
            var minv = new long[m + 1];
            Array.Fill(minv, long.MaxValue);
            var used = new bool[m + 1];

            while (true)
            {
                used[j0] = true;
                int i0 = p[j0];
                long delta = long.MaxValue;
                int j1 = -1;

                for (int j = 1; j <= m; j++)
                {
                    if (used[j]) continue;
                    long cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
                    if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                }

                for (int j = 0; j <= m; j++)
                {
                    if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                    else minv[j] -= delta;
                }
                j0 = j1;
                if (p[j0] == 0) break;
            }

            while (j0 != 0) { int j1 = way[j0]; p[j0] = p[j1]; j0 = j1; }
        }

        var assignment = new int[n];
        Array.Fill(assignment, -1);
        for (int j = 1; j <= m; j++)
            if (p[j] != 0) assignment[p[j] - 1] = j - 1;

        // ИСПРАВЛЕНИЕ: считаем стоимость напрямую из матрицы назначений
        long totalCost = 0;
        for (int i = 0; i < n; i++)
            if (assignment[i] != -1) totalCost += cost[i][assignment[i]];

        return (assignment, totalCost);
    }
}
```

## Задача 20. Поток минимальной стоимости (MCMF)
```csharp
public class MinCostFlow
{
    private struct Edge { public int To, Cap, Rev; public long Cost; }

    private readonly List<List<Edge>> _g;
    private readonly int _n;

    public MinCostFlow(int n) { _n = n; _g = Enumerable.Range(0, n).Select(_ => new List<Edge>()).ToList(); }

    public void AddEdge(int from, int to, int cap, long cost)
    {
        _g[from].Add(new Edge { To = to, Cap = cap, Cost = cost, Rev = _g[to].Count });
        _g[to].Add(new Edge { To = from, Cap = 0, Cost = -cost, Rev = _g[from].Count - 1 });
    }

    public (int flow, long cost) Solve(int s, int t, int maxFlow)
    {
        const long INF = long.MaxValue / 2;
        int totalFlow = 0;
        long totalCost = 0;
        var potential = new long[_n];

        while (totalFlow < maxFlow)
        {
            // Дейкстра с потенциалами
            var dist = new long[_n];
            Array.Fill(dist, INF);
            dist[s] = 0;
            var prevv = new int[_n];
            var preve = new int[_n];
            Array.Fill(prevv, -1);

            var pq = new SortedSet<(long d, int u)>(
                Comparer<(long, int)>.Create((a, b) =>
                    a.d != b.d ? a.d.CompareTo(b.d) : a.u.CompareTo(b.u)));
            pq.Add((0, s));

            while (pq.Count > 0)
            {
                var (d, v) = pq.Min; pq.Remove(pq.Min);
                if (d > dist[v]) continue;
                for (int i = 0; i < _g[v].Count; i++)
                {
                    var e = _g[v][i];
                    if (e.Cap <= 0) continue;
                    long nd = dist[v] + e.Cost + potential[v] - potential[e.To];
                    if (nd < dist[e.To])
                    {
                        pq.Remove((dist[e.To], e.To));
                        dist[e.To] = nd;
                        prevv[e.To] = v;
                        preve[e.To] = i;
                        pq.Add((nd, e.To));
                    }
                }
            }

            if (dist[t] == INF) break;
            for (int v = 0; v < _n; v++)
                if (dist[v] < INF) potential[v] += dist[v];

            // Узкое место
            int aug = maxFlow - totalFlow;
            for (int v = t; prevv[v] != -1; v = prevv[v])
                aug = Math.Min(aug, _g[prevv[v]][preve[v]].Cap);

            // Проталкиваем
            for (int v = t; prevv[v] != -1; v = prevv[v])
            {
                var e = _g[prevv[v]][preve[v]];
                e.Cap -= aug;
                _g[prevv[v]][preve[v]] = e;
                var re = _g[v][e.Rev];
                re.Cap += aug;
                _g[v][e.Rev] = re;
            }

            totalFlow += aug;
            totalCost += aug * potential[t];
        }

        return (totalFlow, totalCost);
    }
}
```
