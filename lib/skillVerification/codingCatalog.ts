import type { CodingChallenge, CodingLanguage } from './types';

export const CODING_SKILL_IDS = new Set(['frontend_developer', 'backend_developer']);

export const CODING_LANGUAGES: CodingLanguage[] = [
  'javascript',
  'python',
  'java',
  'cpp',
  'c',
];

export const FRONTEND_CODING: CodingChallenge[] = [
  {
    id: 'fe-c1',
    title: 'Reverse a string',
    difficulty: 'beginner',
    statement:
      'Given a string s, return the reversed string. This checks basic string manipulation — common in frontend interviews.',
    inputFormat: 'A single line containing string s (1 ≤ |s| ≤ 100)',
    outputFormat: 'Print the reversed string',
    constraints: 's contains only lowercase English letters',
    sampleInput: 'hello',
    sampleOutput: 'olleh',
    languages: CODING_LANGUAGES,
    starterCode: {
      javascript: `// Read from stdin in competitive exam style\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\nfunction reverseString(s) {\n  // TODO: return reversed string\n}\n\nconsole.log(reverseString(input));`,
      python: `import sys\ns = sys.stdin.readline().strip()\n\ndef reverse_string(s):\n    # TODO: return reversed string\n    pass\n\nprint(reverse_string(s))`,
      java: `import java.util.Scanner;\n\npublic class Main {\n  static String reverseString(String s) {\n    // TODO\n    return "";\n  }\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    String s = sc.nextLine();\n    System.out.println(reverseString(s));\n  }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nstring reverseString(string s) {\n  // TODO\n  return "";\n}\n\nint main() {\n  string s;\n  cin >> s;\n  cout << reverseString(s);\n  return 0;\n}`,
      c: `#include <stdio.h>\n#include <string.h>\n\nvoid reverseString(char *s) {\n  // TODO\n}\n\nint main() {\n  char s[101];\n  scanf("%s", s);\n  reverseString(s);\n  printf("%s", s);\n  return 0;\n}`,
    },
    testCases: [
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'makebig', expectedOutput: 'gibekam' },
      { input: 'a', expectedOutput: 'a' },
    ],
  },
  {
    id: 'fe-c2',
    title: 'Count vowels',
    difficulty: 'intermediate',
    statement: 'Count the number of vowels (a, e, i, o, u) in the given lowercase string.',
    inputFormat: 'One line — string s',
    outputFormat: 'Single integer — vowel count',
    constraints: '1 ≤ |s| ≤ 200, lowercase letters only',
    sampleInput: 'makebig',
    sampleOutput: '3',
    languages: CODING_LANGUAGES,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\nfunction countVowels(s) {\n  // TODO\n}\n\nconsole.log(countVowels(input));`,
      python: `import sys\ns = sys.stdin.readline().strip()\n\ndef count_vowels(s):\n    # TODO\n    pass\n\nprint(count_vowels(s))`,
      java: `import java.util.Scanner;\n\npublic class Main {\n  static int countVowels(String s) {\n    // TODO\n    return 0;\n  }\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    System.out.println(countVowels(sc.nextLine()));\n  }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint countVowels(string s) {\n  // TODO\n  return 0;\n}\n\nint main() {\n  string s;\n  cin >> s;\n  cout << countVowels(s);\n  return 0;\n}`,
      c: `#include <stdio.h>\n#include <string.h>\n\nint countVowels(char *s) {\n  // TODO\n  return 0;\n}\n\nint main() {\n  char s[201];\n  scanf("%s", s);\n  printf("%d", countVowels(s));\n  return 0;\n}`,
    },
    testCases: [
      { input: 'makebig', expectedOutput: '3' },
      { input: 'rhythm', expectedOutput: '0' },
      { input: 'aeiou', expectedOutput: '5' },
    ],
  },
];

export const BACKEND_CODING: CodingChallenge[] = [
  {
    id: 'be-c1',
    title: 'Sum of array',
    difficulty: 'beginner',
    statement:
      'Given n integers on one line (space-separated), return their sum. Typical backend parsing task.',
    inputFormat: 'First line: n. Second line: n space-separated integers',
    outputFormat: 'Single integer — sum',
    constraints: '1 ≤ n ≤ 100, each value |x| ≤ 10^6',
    sampleInput: '3\n1 2 3',
    sampleOutput: '6',
    languages: CODING_LANGUAGES,
    starterCode: {
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf8').trim().split('\\n');\nconst n = parseInt(lines[0], 10);\nconst arr = lines[1].split(/\\s+/).map(Number);\n\nfunction sumArray(arr) {\n  // TODO\n}\n\nconsole.log(sumArray(arr));`,
      python: `import sys\nlines = sys.stdin.read().strip().split('\\n')\nn = int(lines[0])\narr = list(map(int, lines[1].split()))\n\ndef sum_array(arr):\n    # TODO\n    pass\n\nprint(sum_array(arr))`,
      java: `import java.util.Scanner;\n\npublic class Main {\n  static long sumArray(int[] arr) {\n    // TODO\n    return 0;\n  }\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] arr = new int[n];\n    for (int i = 0; i < n; i++) arr[i] = sc.nextInt();\n    System.out.println(sumArray(arr));\n  }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nlong long sumArray(vector<int> &arr) {\n  // TODO\n  return 0;\n}\n\nint main() {\n  int n;\n  cin >> n;\n  vector<int> arr(n);\n  for (int i = 0; i < n; i++) cin >> arr[i];\n  cout << sumArray(arr);\n  return 0;\n}`,
      c: `#include <stdio.h>\n\nlong long sumArray(int *arr, int n) {\n  // TODO\n  return 0;\n}\n\nint main() {\n  int n;\n  scanf("%d", &n);\n  int arr[100];\n  for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n  printf("%lld", sumArray(arr, n));\n  return 0;\n}`,
    },
    testCases: [
      { input: '3\n1 2 3', expectedOutput: '6' },
      { input: '1\n42', expectedOutput: '42' },
      { input: '4\n-1 5 0 2', expectedOutput: '6' },
    ],
  },
  {
    id: 'be-c2',
    title: 'Palindrome check',
    difficulty: 'intermediate',
    statement: 'Given a lowercase string, print YES if it reads the same forwards and backwards, else NO.',
    inputFormat: 'One line — string s',
    outputFormat: 'YES or NO',
    constraints: '1 ≤ |s| ≤ 100',
    sampleInput: 'level',
    sampleOutput: 'YES',
    languages: CODING_LANGUAGES,
    starterCode: {
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf8').trim();\n\nfunction isPalindrome(s) {\n  // TODO: return 'YES' or 'NO'\n}\n\nconsole.log(isPalindrome(s));`,
      python: `import sys\ns = sys.stdin.readline().strip()\n\ndef is_palindrome(s):\n    # TODO\n    pass\n\nprint(is_palindrome(s))`,
      java: `import java.util.Scanner;\n\npublic class Main {\n  static String isPalindrome(String s) {\n    // TODO\n    return "NO";\n  }\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    System.out.println(isPalindrome(sc.nextLine()));\n  }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nstring isPalindrome(string s) {\n  // TODO\n  return "NO";\n}\n\nint main() {\n  string s;\n  cin >> s;\n  cout << isPalindrome(s);\n  return 0;\n}`,
      c: `#include <stdio.h>\n#include <string.h>\n\nconst char* isPalindrome(char *s) {\n  // TODO\n  return "NO";\n}\n\nint main() {\n  char s[101];\n  scanf("%s", s);\n  printf("%s", isPalindrome(s));\n  return 0;\n}`,
    },
    testCases: [
      { input: 'level', expectedOutput: 'YES' },
      { input: 'hello', expectedOutput: 'NO' },
      { input: 'a', expectedOutput: 'YES' },
    ],
  },
];

export function getCodingChallenges(skillId: string): CodingChallenge[] | null {
  if (skillId === 'frontend_developer') return FRONTEND_CODING;
  if (skillId === 'backend_developer') return BACKEND_CODING;
  return null;
}

export function isCodingSkill(skillId: string): boolean {
  return CODING_SKILL_IDS.has(skillId);
}
