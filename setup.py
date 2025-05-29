from setuptools import setup, find_packages

setup(
    name="prism",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.32.3",
        "pytest>=8.3.5",
    ],
) 